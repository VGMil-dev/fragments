import type { createInspectorApi } from "../../lib/api/inspector-api.js";
import { InspectorTeacherWorkspace } from "./InspectorTeacherWorkspace.js";

type InspectorApi = ReturnType<typeof createInspectorApi>;

export function TeacherGate({ inspectorApi, navigate }: { inspectorApi: InspectorApi; navigate: (path: string) => void }) {
  return <InspectorTeacherWorkspace api={inspectorApi} navigate={navigate} />;
}
