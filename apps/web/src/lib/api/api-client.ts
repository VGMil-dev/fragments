import { ApiErrorSchema, ApiResultSchema, type ApiResult } from "@fragments/contracts";

type DataSchema = Parameters<typeof ApiResultSchema>[0];
type SchemaOutput<TSchema extends DataSchema> = TSchema extends { readonly _output: infer TOutput }
  ? TOutput
  : never;
type ClientFailure = Extract<ApiResult<never>, { ok: false }>;
type SendResult = { kind: "response"; response: Response } | { kind: "failure"; failure: ClientFailure };

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export interface ApiClient {
  request<TSchema extends DataSchema>(path: string, dataSchema: TSchema, init?: RequestInit): Promise<ApiResult<SchemaOutput<TSchema>>>;
  downloadText(path: string, init?: RequestInit): Promise<ApiResult<string>>;
  downloadPdf(path: string, init?: RequestInit): Promise<ApiResult<Blob>>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const INVALID_RESPONSE = {
  ok: false,
  error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." },
} as const;
const NETWORK_ERROR = {
  ok: false,
  error: { code: "NETWORK_ERROR", message: "No pudimos conectar con el servicio. Inténtalo de nuevo." },
} as const;
const TIMEOUT_ERROR = {
  ok: false,
  error: { code: "REQUEST_TIMEOUT", message: "La solicitud tardó demasiado. Puedes intentarlo de nuevo." },
} as const;
const ABORT_ERROR = {
  ok: false,
  error: { code: "REQUEST_ABORTED", message: "La solicitud se canceló. Puedes volver a intentarlo." },
} as const;
const HTTP_ERROR = {
  ok: false,
  error: { code: "HTTP_ERROR", message: "El servicio no pudo completar la solicitud." },
} as const;
const INVALID_PATH = {
  ok: false,
  error: { code: "INVALID_PATH", message: "No se pudo preparar la solicitud." },
} as const;

function safeFailure<T>(failure: ClientFailure): ApiResult<T> {
  return failure;
}

function resolvePath(baseUrl: string, path: string): string | null {
  const pathOnly = path.split(/[?#]/, 1)[0] ?? "";
  const hasTraversal = pathOnly.split("/").some((segment) => segment === "." || segment === "..");
  if (!path || path.startsWith("//") || path.includes("\\") || hasTraversal || /^[a-z][a-z\d+.-]*:/i.test(path)) return null;
  const prefix = baseUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${suffix}`;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? "";
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function send(path: string, init: RequestInit = {}): Promise<SendResult> {
    const url = resolvePath(baseUrl, path);
    if (!url) return { kind: "failure", failure: INVALID_PATH };

    const controller = new AbortController();
    const headers = new Headers(init.headers);
    headers.delete("authorization");
    if (!headers.has("accept")) headers.set("accept", "application/json");
    let timedOut = false;
    const onCallerAbort = () => controller.abort();
    if (init.signal?.aborted) controller.abort();
    else init.signal?.addEventListener("abort", onCallerAbort, { once: true });

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetcher(url, {
        ...init,
        method: init.method ?? "GET",
        credentials: "same-origin",
        headers,
        signal: controller.signal,
      });
      return { kind: "response", response };
    } catch {
      if (timedOut) return { kind: "failure", failure: TIMEOUT_ERROR };
      if (init.signal?.aborted) return { kind: "failure", failure: ABORT_ERROR };
      return { kind: "failure", failure: NETWORK_ERROR };
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  async function parseError(response: Response): Promise<ClientFailure> {
    try {
      const parsed = ApiResultSchema(ApiErrorSchema).safeParse(await response.json());
      return parsed.success && !parsed.data.ok ? parsed.data : HTTP_ERROR;
    } catch {
      return HTTP_ERROR;
    }
  }

  async function download<T>(
    path: string,
    mediaType: "text/markdown" | "application/pdf",
    read: (response: Response) => Promise<T>,
    init: RequestInit = {},
  ): Promise<ApiResult<T>> {
    const headers = new Headers(init.headers);
    headers.set("accept", mediaType);
    const sent = await send(path, { ...init, headers });
    if (sent.kind === "failure") return safeFailure<T>(sent.failure);
    const { response } = sent;
    if (!response.ok) return safeFailure<T>(await parseError(response));

    const responseType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (responseType !== mediaType) return safeFailure<T>(INVALID_RESPONSE);

    try {
      return { ok: true, data: await read(response) };
    } catch {
      return safeFailure<T>(INVALID_RESPONSE);
    }
  }

  return {
    request: async <TSchema extends DataSchema>(
      path: string,
      dataSchema: TSchema,
      init: RequestInit = {},
    ): Promise<ApiResult<SchemaOutput<TSchema>>> => {
      const sent = await send(path, init);
      if (sent.kind === "failure") return safeFailure<SchemaOutput<TSchema>>(sent.failure);

      let payload: unknown;
      try {
        payload = await sent.response.json();
      } catch {
        return safeFailure<SchemaOutput<TSchema>>(INVALID_RESPONSE);
      }

      const parsed = ApiResultSchema(dataSchema).safeParse(payload);
      if (!parsed.success) return safeFailure<SchemaOutput<TSchema>>(INVALID_RESPONSE);
      if (!sent.response.ok && parsed.data.ok) return safeFailure<SchemaOutput<TSchema>>(HTTP_ERROR);
      return parsed.data as ApiResult<SchemaOutput<TSchema>>;
    },
    downloadText: (path, init) => download(path, "text/markdown", (response) => response.text(), init),
    downloadPdf: (path, init) => download(path, "application/pdf", (response) => response.blob(), init),
  };
}
