import type { AcademicGalleryDetail, AcademicGalleryEntry } from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import "./gallery-screen.css";

export interface GalleryScreenProps {
  state: AsyncState<AcademicGalleryEntry[]>;
  onChoose: (entry: AcademicGalleryEntry) => void;
  selected?: AcademicGalleryDetail | null;
  detailLoading?: boolean;
  onCloseDetail?: () => void;
  onUseProject?: (entry: AcademicGalleryEntry) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onCreateProposal?: () => void;
  mode?: DataMode;
}

export function GalleryScreen({ state, onChoose, selected, detailLoading = false, onCloseDetail, onUseProject, onLoadMore, hasMore = false, onCreateProposal, mode = "real" }: GalleryScreenProps) {
  const visibleState: AsyncState<AcademicGalleryEntry[]> = state.status === "success" && state.data.length === 0
    ? { status: "empty" }
    : state;

  return (
    <main className="student-screen gallery-screen" aria-labelledby="gallery-title">
      <header className="student-screen__header">
        <div>
          <p className="student-screen__eyebrow">IDEAS PARA EXPLORAR</p>
          <h1 id="gallery-title">Galería de proyectos</h1>
          <p className="student-screen__lead">Encuentra una referencia y dale una forma propia a tu idea.</p>
        </div>
        <DataSourceBadge mode={mode} />
      </header>

      {selected ? (
        <section className="gallery-detail" aria-labelledby="gallery-detail-title">
          <button className="gallery-detail__back" type="button" onClick={onCloseDetail}>← Volver a la galería</button>
          {detailLoading ? <p role="status">Cargando historia del proyecto…</p> : (
            <>
              <p className="student-screen__eyebrow">{selected.project.subject} · {selected.project.theme}</p>
              <h2 id="gallery-detail-title">{selected.project.title}</h2>
              <p className="gallery-detail__byline">Proyecto de <a href={selected.project.author.profileUrl} target="_blank" rel="noreferrer">@{selected.project.author.login}</a> · revisión {selected.project.proposalVersion} · rúbrica {selected.project.rubricTitle} (v{selected.project.rubricVersion})</p>
              <p className="gallery-detail__assignment"><strong>Consigna:</strong> {selected.project.assignment}</p>
              <dl className="gallery-detail__facts">
                <div><dt>Problema</dt><dd>{selected.project.problem}</dd></div>
                <div><dt>Solución</dt><dd>{selected.project.solution}</dd></div>
                <div><dt>Objetivos</dt><dd><ul>{selected.project.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul></dd></div>
                <div><dt>Alcance del MVP</dt><dd>{selected.project.scope}</dd></div>
                <div><dt>Restricciones</dt><dd>{selected.project.constraints.length ? selected.project.constraints.join(" · ") : "Sin restricciones indicadas."}</dd></div>
                <div><dt>Habilidades</dt><dd>{selected.project.skills.length ? selected.project.skills.join(" · ") : "En desarrollo."}</dd></div>
              </dl>
              <p className="gallery-detail__status">{selected.project.academicStatus} · publicada {new Date(selected.project.publishedAt).toLocaleDateString("es-CO")}</p>
              {selected.history.length > 1 ? <section className="gallery-detail__history" aria-label="Versiones históricas elegibles"><h3>Versiones evaluadas</h3><ol>{selected.history.map((revision) => <li key={`${revision.id}-${revision.proposalVersion}`}>Revisión {revision.proposalVersion} · {revision.rubricTitle} (v{revision.rubricVersion}) · {new Date(revision.publishedAt).toLocaleDateString("es-CO")}</li>)}</ol></section> : null}
              {onUseProject ? <button className="button button--primary" type="button" onClick={() => onUseProject(selected.project)}>Tomar como inspiración</button> : null}
            </>
          )}
        </section>
      ) : <AsyncStateView
        state={visibleState}
        emptyAction={onCreateProposal ? (
          <button className="button button--primary" type="button" onClick={onCreateProposal}>Crear una propuesta</button>
        ) : null}
        render={(entries) => (
          <ul className="gallery-list" aria-label="Proyectos publicados">
            {entries.map((entry) => (
              <li className="gallery-list__item" key={entry.id}>
                <article className="gallery-entry">
                  <div className="gallery-entry__copy">
                    <h2>{entry.title}</h2>
                    <p>{entry.summary}</p>
                    <p className="gallery-entry__author"><a href={entry.author.profileUrl} target="_blank" rel="noreferrer">{entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" loading="lazy" /> : null}@{entry.author.login}</a> · {entry.subject} / {entry.theme}</p>
                    <ul className="gallery-entry__tags" aria-label={`Habilidades y temas de ${entry.title}`}>
                      {entry.skills.map((skill) => <li key={`skill-${skill}`}>{skill}</li>)}
                      {entry.tags.map((tag) => <li key={`tag-${tag}`}>{tag}</li>)}
                    </ul>
                    <p className="gallery-entry__context">Consigna: {entry.assignment}</p>
                    <p className="gallery-entry__context">Revisión {entry.proposalVersion} · rúbrica {entry.rubricTitle} (v{entry.rubricVersion}) · {entry.academicStatus}</p>
                  </div>
                  <button
                    className="gallery-entry__action"
                    type="button"
                    aria-label={`Ver detalles de ${entry.title}`}
                    onClick={() => onChoose(entry)}
                  >
                    Ver proyecto <span aria-hidden="true">→</span>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      />}
      {!selected && hasMore ? <button className="gallery-load-more" type="button" onClick={onLoadMore}>Cargar más proyectos</button> : null}
    </main>
  );
}
