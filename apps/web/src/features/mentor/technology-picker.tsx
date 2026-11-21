import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import type { TechnologyCatalogEntry, TechnologyCatalogPage } from "@fragments/contracts";
import { studentApi } from "../../lib/api/student-api-instance";
import "./technology-picker.css";

type PageResult = { ok: true; data: TechnologyCatalogPage } | { ok: false; error: { message: string } };
const fetchCatalog = (query: string, cursor?: string, selectedIds: string[] = []) => studentApi.getTechnologyCatalog(query, cursor, selectedIds);
const fetchSuggestions = (cursor?: string) => studentApi.getSuggestedTechnologies(cursor);
export interface TechnologyPickerProps {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[], entries: TechnologyCatalogEntry[], removed?: TechnologyCatalogEntry) => void;
  legacyNames?: string[];
  onRemoveLegacy?: (name: string) => void;
  disabled?: boolean;
  searchCatalog?: (query: string, cursor?: string, selectedIds?: string[]) => Promise<PageResult>;
  loadSuggestions?: (cursor?: string) => Promise<PageResult>;
}

export function TechnologyPicker({ selectedIds, onSelectedIdsChange, legacyNames = [], onRemoveLegacy, disabled = false, searchCatalog = fetchCatalog, loadSuggestions = fetchSuggestions }: TechnologyPickerProps) {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<TechnologyCatalogPage>({ items: [], nextCursor: null });
  const [suggestions, setSuggestions] = useState<TechnologyCatalogPage>({ items: [], nextCursor: null });
  const [labels, setLabels] = useState<Record<string, TechnologyCatalogEntry>>({});
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const unverifiedNames = legacyNames.filter((name) => !selectedIds.some((id) => labels[id]?.name === name));
  const selectionCount = selectedIds.length + unverifiedNames.length;

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void Promise.all([loadSuggestions(), searchCatalog(query, undefined, selectedIds)]).then(([suggested, searched]) => {
      if (!current) return;
      if (!suggested.ok || !searched.ok) { setError(!suggested.ok ? suggested.error.message : !searched.ok ? searched.error.message : "No se pudo cargar el catálogo."); return; }
      setSuggestions(suggested.data);
      setCatalog(searched.data);
      setLabels((prior) => Object.fromEntries([...Object.values(prior), ...suggested.data.items, ...searched.data.items].map((entry) => [entry.id, entry])));
      setHasLoaded(true);
    }).catch(() => { if (current) setError("No pudimos cargar las tecnologías. Inténtalo de nuevo."); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [query, selectedIds.join(","), searchCatalog, loadSuggestions, retryCount]);

  function toggle(entry: TechnologyCatalogEntry) {
    const next = selectedIds.includes(entry.id) ? selectedIds.filter((id) => id !== entry.id) : [...selectedIds, entry.id];
    const nextLabels = { ...labels, [entry.id]: entry };
    setLabels(nextLabels);
    onSelectedIdsChange(next, next.flatMap((id) => nextLabels[id] ? [nextLabels[id]!] : []), selectedIds.includes(entry.id) ? entry : undefined);
  }
  function renderList(title: string, page: TechnologyCatalogPage, embedded = false) {
    const visibleItems = title === "Catálogo de tecnologías" && query.trim()
      ? page.items.filter((entry) => entry.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
      : page.items;
    return <section className={`technology-picker__list${embedded ? " technology-picker__list--embedded" : ""}`} aria-label={title}>
      <h3>{title.startsWith("Sugeridas") ? <Database aria-hidden="true" size={20} /> : null}{title}</h3>
      {visibleItems.length ? <ul className="technology-picker__options">{visibleItems.map((entry) => <li key={entry.id}>
        <button type="button" className={`technology-picker__option${selectedIds.includes(entry.id) ? " is-selected" : ""}`} aria-pressed={selectedIds.includes(entry.id)} disabled={disabled || (!selectedIds.includes(entry.id) && selectionCount >= 20)} onClick={() => toggle(entry)}><span aria-hidden="true">{selectedIds.includes(entry.id) ? "✓" : "+"}</span>{entry.name}</button>
      </li>)}</ul> : <p>{title.startsWith("Sugeridas") ? "No tienes tecnologías sugeridas de tus aulas activas." : query ? "No hay resultados para esta búsqueda." : "El catálogo todavía no tiene tecnologías disponibles."}</p>}
      {page.nextCursor ? <button type="button" disabled={disabled || loading} onClick={() => void (title.startsWith("Sugeridas") ? loadSuggestions(page.nextCursor!) : searchCatalog(query, page.nextCursor!)).then((result) => {
        if (!result.ok) { setError(result.error.message); return; }
        const setPage = title.startsWith("Sugeridas") ? setSuggestions : setCatalog;
        setPage((previous) => ({ items: [...previous.items, ...result.data.items], nextCursor: result.data.nextCursor }));
        setLabels((previous) => Object.fromEntries([...Object.values(previous), ...result.data.items].map((entry) => [entry.id, entry])));
      })}>Cargar más</button> : null}
    </section>;
  }

  return <div className="technology-picker" aria-busy={loading}>
    {loading ? <p role="status">{hasLoaded ? "Actualizando resultados…" : "Cargando catálogo y sugerencias…"}</p> : null}
    {error ? <div role="alert"><p>{error}</p><button type="button" disabled={disabled} onClick={() => setRetryCount((count) => count + 1)}>Volver a intentar</button></div> : null}
    {hasLoaded ? <div className="technology-picker__columns">
      {renderList("Sugeridas por tu aula", suggestions)}
      <section className="technology-picker__explore" aria-label="Explorar catálogo">
        <h3>Explorar catálogo</h3>
        <div className="technology-picker__search-row">
          <label className="technology-picker__search" aria-label="Buscar en el catálogo"><span className="technology-picker__sr-only">Buscar en el catálogo</span><input type="search" value={query} maxLength={100} disabled={disabled} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tecnología…" /></label>
          {!query.trim() ? <button type="button" className="technology-picker__browse" disabled={disabled || loading} onClick={() => setCatalogExpanded(true)}>Ver todas</button> : null}
        </div>
        <div className="technology-picker__selected" aria-label="Tecnologías seleccionadas"><h4>Seleccionadas ({selectionCount}/20)</h4>
          {selectedIds.length ? <ul className="technology-picker__selected-list">{selectedIds.map((id) => <li key={id}><span>{labels[id]?.name ?? "Tecnología seleccionada"}</span><button type="button" disabled={disabled} aria-label={`Quitar ${labels[id]?.name ?? "tecnología"}`} onClick={() => labels[id] && toggle(labels[id]!)}>×</button></li>)}</ul> : <p>Aún no has seleccionado tecnologías.</p>}
          {unverifiedNames.length ? <><h4>Etiquetas sin identidad de catálogo</h4><ul className="technology-picker__selected-list">{unverifiedNames.map((name, index) => <li key={`${name}-${index}`}><span>{name} <small>Texto importado o histórico; no es una selección del catálogo.</small></span><button type="button" disabled={disabled} aria-label={`Quitar ${name}`} onClick={() => onRemoveLegacy?.(name)}>×</button></li>)}</ul></> : null}
        </div>
        {query.trim() || catalogExpanded || catalog.items.length === 0 ? renderList("Catálogo de tecnologías", catalog, true) : <p className="technology-picker__browse-hint">Busca una tecnología del catálogo o explóralo completo.</p>}
      </section>
    </div> : null}
  </div>;
}
