import type { GalleryEntry } from "@fragments/contracts";
import { AsyncStateView, type AsyncState } from "../../hooks/async-state";
import { DataSourceBadge, type DataMode } from "../../hooks/data-source-badge";
import "./gallery-screen.css";

export interface GalleryScreenProps {
  state: AsyncState<GalleryEntry[]>;
  onChoose: (entry: GalleryEntry) => void;
  onCreateProposal?: () => void;
  mode?: DataMode;
}

export function GalleryScreen({ state, onChoose, onCreateProposal, mode = "real" }: GalleryScreenProps) {
  const visibleState: AsyncState<GalleryEntry[]> = state.status === "success" && state.data.length === 0
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

      <AsyncStateView
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
                    <ul className="gallery-entry__tags" aria-label={`Habilidades y temas de ${entry.title}`}>
                      {entry.skills.map((skill) => <li key={`skill-${skill}`}>{skill}</li>)}
                      {entry.tags.map((tag) => <li key={`tag-${tag}`}>{tag}</li>)}
                    </ul>
                    {entry.estimatedMinutes ? <p className="gallery-entry__time">Aproximadamente {entry.estimatedMinutes} minutos</p> : null}
                  </div>
                  <button
                    className="gallery-entry__action"
                    type="button"
                    aria-label={`Usar ${entry.title} como referencia`}
                    onClick={() => onChoose(entry)}
                  >
                    Explorar <span aria-hidden="true">→</span>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      />
    </main>
  );
}
