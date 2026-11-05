import "./data-source-badge.css";

export type DataMode = "real" | "fake";

export function DataSourceBadge({ mode, modelId }: { mode: DataMode; modelId?: string }) {
  const isFakeProvider = modelId ? /^fake[/:]/i.test(modelId) : false;
  if (mode === "real" && !isFakeProvider) return null;
  return <p className="data-source-badge" role="note">Datos de ejemplo (fake)</p>;
}
