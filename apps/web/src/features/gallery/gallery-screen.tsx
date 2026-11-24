import type { AcademicGalleryDetail, AcademicGalleryEntry } from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import { coverTemplateFor, ProjectCover } from "../covers/project-cover";
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
      <aside className="gallery-publication-note" role="note" aria-label="Aviso de publicación">
        <p className="gallery-publication-note__essential"><strong>Aviso:</strong> las evaluaciones de Mentor que cumplen los criterios se publican automáticamente. El estudiante no puede retirar una ficha desde el portal; editar la propuesta tampoco retira una versión publicada.</p>
        <details>
          <summary>Ver alcance y privacidad</summary>
          <p>La ficha muestra la propuesta, metas, habilidades, etiquetas y temas, alcance, restricciones, perfil GitHub y contexto de materia, consigna y rúbrica; no muestra puntaje ni comentarios privados. La ven estudiantes con sesión y docentes. El estudiante no tiene opt-out. Un docente puede retirar una publicación con registro de auditoría.</p>
        </details>
      </aside>

      {selected ? (
        <section className="gallery-detail" aria-labelledby="gallery-detail-title">
          <button className="gallery-detail__back" type="button" onClick={onCloseDetail}>← Volver a la galería</button>
          {detailLoading ? <p role="status">Cargando historia del proyecto…</p> : (
            <>
              <p className="student-screen__eyebrow">{selected.project.subject} · {selected.project.theme}</p>
              <h2 id="gallery-detail-title">{selected.project.title}</h2>
              <ProjectCover className="gallery-entry__cover" title={selected.project.title} template={coverTemplateFor([selected.project.title, selected.project.summary, selected.project.subject, selected.project.theme, ...selected.project.skills, ...selected.project.tags].join(" "))} />
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
                  <ProjectCover className="gallery-entry__cover" title={entry.title} template={coverTemplateFor([entry.title, entry.summary, entry.subject, entry.theme, ...entry.skills, ...entry.tags].join(" "))} />
                  <div className="gallery-entry__copy">
                    <div className="gallery-entry__title-row"><h2>{entry.title}</h2><span className="gallery-entry__status">{entry.academicStatus}</span></div>
                    <p>{entry.summary}</p>
                    <p className="gallery-entry__author"><a href={entry.author.profileUrl} target="_blank" rel="noreferrer">{entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" loading="lazy" /> : null}@{entry.author.login}</a> · {entry.subject} / {entry.theme}</p>
                    <ul className="gallery-entry__tags" aria-label={`Habilidades y temas de ${entry.title}`}>
                      {entry.skills.map((skill) => <li key={`skill-${skill}`}>{skill}</li>)}
                      {entry.tags.map((tag) => <li key={`tag-${tag}`}>{tag}</li>)}
                    </ul>
                    <p className="gallery-entry__assignment">Consigna: {entry.assignment}</p>
                    <p className="gallery-entry__context">Revisión {entry.proposalVersion} · rúbrica {entry.rubricTitle} (v{entry.rubricVersion})</p>
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
