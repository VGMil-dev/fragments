export const ADMIN_AUDIT_LOG_CAPACITY = 100;
export const ADMIN_AUDIT_LOG_MAX_PAGE_SIZE = 50;

export type AdminAuditSourceEvent = {
  requestId: string;
  event: "admin.classroom_requests.read" | "admin.queue_summary.read";
  occurredAt: string;
  adminActorId: string;
};

export type AdminAuditLogEntry = Pick<AdminAuditSourceEvent, "requestId" | "event" | "occurredAt"> & {
  actorType: "admin";
};

type Options = {
  writeLine: (line: string) => void | Promise<void>;
  capacity?: number;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedEvents = new Set<AdminAuditSourceEvent["event"]>([
  "admin.classroom_requests.read",
  "admin.queue_summary.read",
]);

/**
 * Stores a short, safe in-process view of admin audit writes.
 * The injected sink remains the durable/operational log destination; this buffer
 * is intentionally ephemeral and is populated only after that sink accepts a line.
 */
export function createAdminAuditLog(options: Options) {
  const capacity = safeCapacity(options.capacity);
  const entries: AdminAuditLogEntry[] = [];

  return {
    async write(source: AdminAuditSourceEvent): Promise<void> {
      const safeSource = validateSource(source);
      // Keep the established audit record in stdout for operations/accountability.
      // The in-memory feed below intentionally drops the user identity.
      await options.writeLine(JSON.stringify(safeSource));
      entries.unshift({
        requestId: safeSource.requestId,
        event: safeSource.event,
        occurredAt: safeSource.occurredAt,
        actorType: "admin",
      });
      if (entries.length > capacity) entries.length = capacity;
    },

    list(limit = ADMIN_AUDIT_LOG_MAX_PAGE_SIZE): AdminAuditLogEntry[] {
      const bounded = Math.max(1, Math.min(ADMIN_AUDIT_LOG_MAX_PAGE_SIZE, Math.trunc(limit) || 1));
      // Return fresh objects so callers cannot mutate the shared feed.
      return entries.slice(0, bounded).map((entry) => ({ ...entry }));
    },
  };
}

function validateSource(source: AdminAuditSourceEvent): AdminAuditSourceEvent {
  if (!source || typeof source !== "object" || !allowedEvents.has(source.event)) {
    throw new Error("Unsupported admin audit event");
  }
  if (typeof source.requestId !== "string" || !uuid.test(source.requestId)) {
    throw new Error("Invalid admin audit request id");
  }
  if (typeof source.occurredAt !== "string" || !isCanonicalUtcTimestamp(source.occurredAt)) {
    throw new Error("Invalid admin audit timestamp");
  }
  if (typeof source.adminActorId !== "string" || source.adminActorId.trim().length === 0 || source.adminActorId.length > 200) {
    throw new Error("Invalid admin audit actor");
  }
  // Build a new allowlisted record instead of serializing a caller-owned object.
  return {
    requestId: source.requestId,
    event: source.event,
    occurredAt: source.occurredAt,
    adminActorId: source.adminActorId,
  };
}

function isCanonicalUtcTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function safeCapacity(value: number | undefined): number {
  if (value === undefined) return ADMIN_AUDIT_LOG_CAPACITY;
  if (!Number.isInteger(value) || value < 1 || value > ADMIN_AUDIT_LOG_CAPACITY) {
    throw new Error(`Admin audit log capacity must be between 1 and ${ADMIN_AUDIT_LOG_CAPACITY}`);
  }
  return value;
}
