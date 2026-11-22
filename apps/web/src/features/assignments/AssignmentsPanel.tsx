import { useState, type FormEvent } from "react";
import type { AssignmentDraft, ClassroomAssignment, SkillCatalogEntry, StudentAssignment } from "@fragments/contracts";
import "./assignments-panel.css";

type Props = {
  assignments: ClassroomAssignment[];
  skills: Array<SkillCatalogEntry & { enabled?: boolean }>;
  busy?: boolean;
  onCreate: (draft: AssignmentDraft) => Promise<void>;
  onUpdate: (id: string, expectedVersion: number, draft: AssignmentDraft) => Promise<void>;
  onPublish: (id: string, expectedVersion: number) => Promise<void>;
};

const blankDraft = (skillId: string): AssignmentDraft => ({ title: "", instructions: "", objectives: [""], requiredSkillIds: skillId ? [skillId] : [], optionalSkillIds: [] });

export function AssignmentsPanel({ assignments, skills, busy = false, onCreate, onUpdate, onPublish }: Props) {
  const [editing, setEditing] = useState<ClassroomAssignment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draft, setDraft] = useState<AssignmentDraft>(() => blankDraft(skills.find((skill) => skill.enabled !== false)?.id ?? ""));
  const [message, setMessage] = useState("");
  const availableSkills = skills.filter((skill) => skill.enabled !== false);
  const startNew = () => { setEditing(null); setIsCreating(true); setShowPreview(false); setDraft(blankDraft(availableSkills[0]?.id ?? "")); setMessage(""); };
  const startEdit = (assignment: ClassroomAssignment) => { if (!assignment.draft) return; setEditing(assignment); setIsCreating(false); setShowPreview(false); setDraft(assignment.draft); setMessage(""); };
  const setSkill = (id: string, group: "requiredSkillIds" | "optionalSkillIds", checked: boolean) => setDraft((current) => {
    const other = group === "requiredSkillIds" ? "optionalSkillIds" : "requiredSkillIds";
    return { ...current, [group]: checked ? [...current[group], id] : current[group].filter((skillId) => skillId !== id), [other]: current[other].filter((skillId) => skillId !== id) };
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage("");
    const clean = { ...draft, objectives: draft.objectives.map((item) => item.trim()).filter(Boolean) };
    try {
      if (editing) await onUpdate(editing.id, editing.draftVersion, clean);
      else await onCreate(clean);
      setEditing(null); setIsCreating(false); setMessage("Borrador guardado.");
    } catch { setMessage("No se pudo guardar el borrador. Revisa tu conexión e inténtalo de nuevo."); }
  };
  const publish = async (assignment: ClassroomAssignment) => {
    setMessage(""); try { await onPublish(assignment.id, assignment.draftVersion); setMessage("Misión publicada."); }
    catch { setMessage("No se pudo publicar. Actualiza la lista y vuelve a intentar."); }
  };

  return <section className="assignments-panel" aria-labelledby="assignments-panel-title">
    <div className="assignments-panel__heading"><div><p className="assignments-panel__eyebrow">TRABAJO DEL AULA</p><h2 id="assignments-panel-title">Misiones</h2><p>Crea una consigna y define qué habilidades son obligatorias o optativas.</p></div><button type="button" onClick={startNew} disabled={busy || !availableSkills.length}>Crear misión</button></div>
    {message ? <p role="status" className="assignments-panel__message">{message}</p> : null}
    {!availableSkills.length ? <p className="assignments-panel__empty">Activa al menos una habilidad para crear misiones.</p> : null}
    {isCreating || editing ? <form className="assignments-panel__form" onSubmit={submit}>
      <label>Título<input required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Consigna<textarea required maxLength={5000} rows={4} value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} /></label>
      <fieldset><legend>Objetivos</legend>{draft.objectives.map((objective, index) => <div className="assignments-panel__objective" key={index}><input aria-label={`Objetivo ${index + 1}`} required maxLength={240} value={objective} onChange={(event) => setDraft({ ...draft, objectives: draft.objectives.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />{draft.objectives.length > 1 ? <button type="button" className="assignments-panel__remove" onClick={() => setDraft({ ...draft, objectives: draft.objectives.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Quitar objetivo ${index + 1}`}>Quitar</button> : null}</div>)}{draft.objectives.length < 12 ? <button type="button" className="assignments-panel__text-button" onClick={() => setDraft({ ...draft, objectives: [...draft.objectives, ""] })}>Añadir objetivo</button> : null}</fieldset>
      <fieldset><legend>Habilidades</legend><p>Selecciona al menos una habilidad requerida. Cada habilidad aparece en una sola categoría.</p>{availableSkills.map((skill) => <div className="assignments-panel__skill" key={skill.id}><span>{skill.name}</span><label><input type="checkbox" checked={draft.requiredSkillIds.includes(skill.id)} onChange={(event) => setSkill(skill.id, "requiredSkillIds", event.target.checked)} />Requerida</label><label><input type="checkbox" checked={draft.optionalSkillIds.includes(skill.id)} onChange={(event) => setSkill(skill.id, "optionalSkillIds", event.target.checked)} />Optativa</label></div>)}</fieldset>
      <div className="assignments-panel__form-actions"><button type="submit" disabled={busy || draft.requiredSkillIds.length === 0}>{busy ? "Guardando…" : "Guardar borrador"}</button><button type="button" className="assignments-panel__secondary" aria-expanded={showPreview} onClick={() => setShowPreview((visible) => !visible)}>{showPreview ? "Ocultar vista previa" : "Vista previa estudiantil"}</button><button type="button" className="assignments-panel__secondary" onClick={() => { setEditing(null); setIsCreating(false); setShowPreview(false); }}>Cancelar</button></div>
    </form> : null}
    {showPreview && (isCreating || editing) ? <section className="assignments-panel__preview" aria-label="Vista previa para estudiantes"><p className="assignments-panel__eyebrow">VISTA DEL ESTUDIANTE</p><article><h3>{draft.title.trim() || "Título de la misión"}</h3><p>{draft.instructions.trim() || "Aquí aparecerá la consigna."}</p><h4>Objetivos</h4>{draft.objectives.some((objective) => objective.trim()) ? <ul>{draft.objectives.filter((objective) => objective.trim()).map((objective, index) => <li key={`${index}-${objective}`}>{objective.trim()}</li>)}</ul> : <p>Aún no hay objetivos.</p>}<h4>Habilidades requeridas</h4><p>{draft.requiredSkillIds.map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean).join(", ") || "Sin habilidades requeridas"}</p>{draft.optionalSkillIds.length ? <><h4>Habilidades optativas</h4><p>{draft.optionalSkillIds.map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean).join(", ") || "Sin habilidades optativas"}</p></> : null}</article></section> : null}
    {assignments.length ? <ul className="assignments-panel__list">{assignments.map((assignment) => <li key={assignment.id}><article><div><h3>{assignment.draft?.title ?? assignment.versions.at(-1)?.title ?? "Misión sin título"}</h3><p>{assignment.publishedVersion ? `Versión publicada ${assignment.publishedVersion}` : "Borrador sin publicar"}{assignment.publishedVersion && assignment.publishedVersion < assignment.draftVersion ? " · Hay cambios sin publicar" : ""}</p></div><div className="assignments-panel__actions"><button type="button" className="assignments-panel__secondary" onClick={() => startEdit(assignment)} disabled={busy || !assignment.draft}>Editar borrador</button><button type="button" onClick={() => void publish(assignment)} disabled={busy || !assignment.draft || assignment.draft.requiredSkillIds.length === 0}>Publicar</button></div></article></li>)}</ul> : !isCreating ? <p className="assignments-panel__empty">Aún no hay misiones en esta aula.</p> : null}
  </section>;
}

export function StudentAssignmentsList({ assignments, onStartProposal }: { assignments: StudentAssignment[]; onStartProposal?: (assignment: StudentAssignment) => void }) {
  return <section className="student-assignments" aria-labelledby="student-assignments-title">
    <h2 id="student-assignments-title">Misiones del aula</h2>
    {assignments.length ? <ul>{assignments.map((assignment) => <li key={assignment.id}>
      <article>
        <p className="assignments-panel__eyebrow">{assignment.classroomTitle} · {assignment.subject}</p>
        <h3>{assignment.title}</h3>
        <p>{assignment.instructions}</p>
        <h4>Objetivos</h4>
        <ul>{assignment.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
        <h4>Habilidades requeridas</h4>
        <p>{assignment.requiredSkills.map((skill) => skill.name).join(", ")}</p>
        {assignment.optionalSkills.length ? <><h4>Habilidades optativas</h4><p>{assignment.optionalSkills.map((skill) => skill.name).join(", ")}</p></> : null}
        <details className="student-assignments__context">
          <summary>Contexto para tu propuesta · versión {assignment.mentorContext.version}</summary>
          <div>
            <p><strong>{assignment.mentorContext.config.theme}</strong></p>
            <p>{assignment.mentorContext.config.assignment}</p>
            <p>Nivel esperado: {assignment.mentorContext.config.expectedLevel}</p>
            {assignment.mentorContext.config.requirements.length ? <><h4>Requisitos de la misión y del aula</h4><ul>{assignment.mentorContext.config.requirements.map((requirement, index) => <li key={`${index}-${requirement}`}>{requirement}</li>)}</ul></> : null}
          </div>
        </details>
        <button type="button" aria-label={`Iniciar propuesta para ${assignment.title}`} disabled={!onStartProposal} onClick={() => onStartProposal?.(assignment)}>Iniciar propuesta</button>
      </article>
    </li>)}</ul> : <p className="assignments-panel__empty">Tu docente aún no ha publicado misiones en esta aula.</p>}
  </section>;
}
