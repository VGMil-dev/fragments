import { useState, type FormEvent } from "react";
import { AssignmentPublicationSchema, type AssignmentDeliverable, type AssignmentDraft, type AssignmentMissionRubricDraft, type ClassroomAssignment, type ProposalDraftResponse, type SkillCatalogEntry, type StudentAssignment } from "@fragments/contracts";
import "./assignments-panel.css";

type Props = {
  assignments: ClassroomAssignment[];
  skills: Array<SkillCatalogEntry & { enabled?: boolean }>;
  busy?: boolean;
  loading?: boolean;
  missionPlanAvailable?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  onCreate: (draft: AssignmentDraft) => Promise<void>;
  onUpdate: (id: string, expectedVersion: number, draft: AssignmentDraft) => Promise<void>;
  onPublish: (id: string, expectedVersion: number) => Promise<void>;
};

let draftItemSequence = 0;
const draftItemId = (prefix: string) => `${prefix}-draft-${++draftItemSequence}`;
const blankRubric = (): AssignmentMissionRubricDraft => ({ title: "", criteria: [] });
const blankDraft = (skillId: string): AssignmentDraft => ({ title: "", instructions: "", objectives: [""], requiredSkillIds: skillId ? [skillId] : [], optionalSkillIds: [], missionRubric: blankRubric(), deliverables: [] });

export function AssignmentsPanel({ assignments, skills, busy = false, loading = false, missionPlanAvailable = true, loadError = null, onRetryLoad, onCreate, onUpdate, onPublish }: Props) {
  const [editing, setEditing] = useState<ClassroomAssignment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draft, setDraft] = useState<AssignmentDraft>(() => blankDraft(skills.find((skill) => skill.enabled !== false)?.id ?? ""));
  const [message, setMessage] = useState("");
  const availableSkills = skills.filter((skill) => skill.enabled !== false);
  const startNew = () => { setEditing(null); setIsCreating(true); setShowPreview(false); setDraft(blankDraft(availableSkills[0]?.id ?? "")); setMessage(""); };
  const startEdit = (assignment: ClassroomAssignment) => { if (!assignment.draft) return; setEditing(assignment); setIsCreating(false); setShowPreview(false); setDraft({ ...assignment.draft, missionRubric: assignment.draft.missionRubric ?? blankRubric(), deliverables: assignment.draft.deliverables ?? [] }); setMessage(""); };
  const setSkill = (id: string, group: "requiredSkillIds" | "optionalSkillIds", checked: boolean) => setDraft((current) => {
    const other = group === "requiredSkillIds" ? "optionalSkillIds" : "requiredSkillIds";
    return { ...current, [group]: checked ? [...current[group], id] : current[group].filter((skillId) => skillId !== id), [other]: current[other].filter((skillId) => skillId !== id) };
  });
  const updateCriterion = (index: number, patch: Partial<AssignmentMissionRubricDraft["criteria"][number]>) => setDraft((current) => {
    const missionRubric = current.missionRubric ?? blankRubric();
    return { ...current, missionRubric: { ...missionRubric, criteria: missionRubric.criteria.map((criterion, itemIndex) => itemIndex === index ? { ...criterion, ...patch } : criterion) } };
  });
  const addCriterion = () => setDraft((current) => {
    const missionRubric = current.missionRubric ?? blankRubric();
    if (missionRubric.criteria.length >= 10) return current;
    return { ...current, missionRubric: { ...missionRubric, criteria: [...missionRubric.criteria, { id: draftItemId("criterion"), title: "", description: "", weight: 0 }] } };
  });
  const removeCriterion = (index: number) => setDraft((current) => {
    const missionRubric = current.missionRubric ?? blankRubric();
    const removedId = missionRubric.criteria[index]?.id;
    return { ...current, missionRubric: { ...missionRubric, criteria: missionRubric.criteria.filter((_, itemIndex) => itemIndex !== index) },
      deliverables: current.deliverables.map((item) => ({ ...item, criterionIds: item.criterionIds.filter((id) => id !== removedId) })) };
  });
  const addDeliverable = () => setDraft((current) => {
    if (current.deliverables.length >= 12) return current;
    const next: AssignmentDeliverable = { id: draftItemId("delivery"), order: current.deliverables.length + 1, title: "", type: current.deliverables.length === 0 ? "proposal" : "progress", requirements: [""], dueDate: null, criterionIds: [] };
    return { ...current, deliverables: [...current.deliverables, next] };
  });
  const updateDeliverable = (index: number, patch: Partial<AssignmentDeliverable>) => setDraft((current) => ({ ...current,
    deliverables: current.deliverables.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const removeDeliverable = (index: number) => setDraft((current) => ({ ...current, deliverables: current.deliverables.filter((_, itemIndex) => itemIndex !== index).map((item, orderIndex) => ({ ...item, order: orderIndex + 1 })) }));
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
    <div className="assignments-panel__heading"><div><p className="assignments-panel__eyebrow">TRABAJO DEL AULA</p><h2 id="assignments-panel-title">Misiones</h2><p>Crea una consigna y define qué habilidades son obligatorias o optativas.</p></div><button type="button" onClick={startNew} disabled={busy || !missionPlanAvailable || !availableSkills.length}>Crear misión</button></div>
    {!missionPlanAvailable ? <p className="assignments-panel__hint" role="status">El servidor aún no admite rúbricas y entregas versionadas. Puedes consultar las misiones actuales; vuelve a cargar el aula después de actualizar el servicio para editarlas.</p> : null}
    {message ? <p role="status" className="assignments-panel__message">{message}</p> : null}
    {loadError ? <div className="assignments-panel__message" role="alert"><p>{loadError}</p>{onRetryLoad ? <button type="button" className="assignments-panel__secondary" disabled={busy} onClick={onRetryLoad}>Reintentar carga de misiones</button> : null}</div> : null}
    {!availableSkills.length ? <p className="assignments-panel__empty">Activa al menos una habilidad para crear misiones.</p> : null}
    {isCreating || editing ? <form className="assignments-panel__form" onSubmit={submit}>
      <label>Título<input required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Consigna<textarea required maxLength={5000} rows={4} value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} /></label>
      <fieldset><legend>Objetivos</legend>{draft.objectives.map((objective, index) => <div className="assignments-panel__objective" key={index}><input aria-label={`Objetivo ${index + 1}`} required maxLength={240} value={objective} onChange={(event) => setDraft({ ...draft, objectives: draft.objectives.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />{draft.objectives.length > 1 ? <button type="button" className="assignments-panel__remove" onClick={() => setDraft({ ...draft, objectives: draft.objectives.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Quitar objetivo ${index + 1}`}>Quitar</button> : null}</div>)}{draft.objectives.length < 12 ? <button type="button" className="assignments-panel__text-button" onClick={() => setDraft({ ...draft, objectives: [...draft.objectives, ""] })}>Añadir objetivo</button> : null}</fieldset>
      <fieldset className="assignments-panel__rubric"><legend>Rúbrica propia de la misión</legend><p>Define criterios verificables y distribuye 100 puntos orientativos. La valoración oficial sigue a cargo del docente.</p>
        <label>Título de la rúbrica<input maxLength={120} value={draft.missionRubric?.title ?? ""} onChange={(event) => setDraft((current) => ({ ...current, missionRubric: { ...(current.missionRubric ?? blankRubric()), title: event.target.value } }))} /></label>
        {draft.missionRubric?.criteria.map((criterion, index) => <section className="assignments-panel__criterion" key={criterion.id} aria-label={`Criterio ${index + 1}`}>
          <label>Nombre del criterio {index + 1}<input maxLength={120} value={criterion.title} onChange={(event) => updateCriterion(index, { title: event.target.value })} /></label>
          <label>Descriptor del criterio {index + 1}<textarea maxLength={800} rows={2} value={criterion.description} onChange={(event) => updateCriterion(index, { description: event.target.value })} /></label>
          <label>Peso del criterio {index + 1}<input type="number" min={0} max={100} value={criterion.weight} onChange={(event) => updateCriterion(index, { weight: Number(event.target.value) })} /></label>
          <button type="button" className="assignments-panel__remove" onClick={() => removeCriterion(index)}>Quitar criterio</button>
        </section>)}
        <p role="status">Total actual: {draft.missionRubric?.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) ?? 0} / 100</p>
        {(draft.missionRubric?.criteria.length ?? 0) < 10 ? <button type="button" className="assignments-panel__text-button" onClick={addCriterion}>Añadir criterio</button> : null}
      </fieldset>
      <fieldset className="assignments-panel__deliverables"><legend>Entregas de la misión</legend><p>Ordena varias entregas del mismo proyecto. Las fechas son opcionales y no bloquean el trabajo.</p>
        {draft.deliverables.map((deliverable, index) => <section className="assignments-panel__deliverable" key={deliverable.id} aria-label={`Entrega ${index + 1}`}>
          <p className="assignments-panel__eyebrow">Entrega {deliverable.order}</p>
          <label>Nombre de la entrega {index + 1}<input maxLength={160} value={deliverable.title} onChange={(event) => updateDeliverable(index, { title: event.target.value })} /></label>
          <label>Tipo de entrega<select value={deliverable.type} onChange={(event) => updateDeliverable(index, { type: event.target.value as AssignmentDeliverable["type"] })}><option value="proposal">Propuesta</option><option value="progress">Avance</option><option value="final">Final</option></select></label>
          <label>Fecha opcional<input type="date" value={deliverable.dueDate ?? ""} onChange={(event) => updateDeliverable(index, { dueDate: event.target.value || null })} /></label>
          <fieldset><legend>Requisitos de esta entrega</legend>{deliverable.requirements.map((requirement, requirementIndex) => <label key={requirementIndex}>Requisito {requirementIndex + 1}<input maxLength={500} value={requirement} onChange={(event) => updateDeliverable(index, { requirements: deliverable.requirements.map((item, itemIndex) => itemIndex === requirementIndex ? event.target.value : item) })} /></label>)}<button type="button" className="assignments-panel__text-button" onClick={() => updateDeliverable(index, { requirements: [...deliverable.requirements, ""] })}>Añadir requisito</button></fieldset>
          <fieldset><legend>Criterios aplicables</legend>{draft.missionRubric?.criteria.length ? draft.missionRubric.criteria.map((criterion) => <label key={criterion.id}><input type="checkbox" checked={deliverable.criterionIds.includes(criterion.id)} onChange={(event) => updateDeliverable(index, { criterionIds: event.target.checked ? [...deliverable.criterionIds, criterion.id] : deliverable.criterionIds.filter((id) => id !== criterion.id) })} />{criterion.title || "Criterio sin nombre"}</label>) : <p>Añade criterios a la rúbrica para asignarlos a esta entrega.</p>}</fieldset>
          <button type="button" className="assignments-panel__remove" onClick={() => removeDeliverable(index)}>Quitar entrega</button>
        </section>)}
        {draft.deliverables.length < 12 ? <button type="button" className="assignments-panel__text-button" onClick={addDeliverable}>Añadir entrega</button> : null}
        <p>Configura al menos dos entregas, cada una con requisitos y criterios aplicables, antes de publicar.</p>
      </fieldset>
      <fieldset><legend>Habilidades</legend><p>Selecciona al menos una habilidad requerida. Cada habilidad aparece en una sola categoría.</p>{availableSkills.map((skill) => <div className="assignments-panel__skill" key={skill.id}><span>{skill.name}</span><label><input type="checkbox" checked={draft.requiredSkillIds.includes(skill.id)} onChange={(event) => setSkill(skill.id, "requiredSkillIds", event.target.checked)} />Requerida</label><label><input type="checkbox" checked={draft.optionalSkillIds.includes(skill.id)} onChange={(event) => setSkill(skill.id, "optionalSkillIds", event.target.checked)} />Optativa</label></div>)}</fieldset>
      <div className="assignments-panel__form-actions"><button type="submit" disabled={busy || draft.requiredSkillIds.length === 0}>{busy ? "Guardando…" : "Guardar borrador"}</button><button type="button" className="assignments-panel__secondary" aria-expanded={showPreview} onClick={() => setShowPreview((visible) => !visible)}>{showPreview ? "Ocultar vista previa" : "Vista previa estudiantil"}</button><button type="button" className="assignments-panel__secondary" onClick={() => { setEditing(null); setIsCreating(false); setShowPreview(false); }}>Cancelar</button></div>
    </form> : null}
    {showPreview && (isCreating || editing) ? <section className="assignments-panel__preview" aria-label="Vista previa para estudiantes"><p className="assignments-panel__eyebrow">VISTA DEL ESTUDIANTE</p><article><h3>{draft.title.trim() || "Título de la misión"}</h3><p>{draft.instructions.trim() || "Aquí aparecerá la consigna."}</p><h4>Objetivos</h4>{draft.objectives.some((objective) => objective.trim()) ? <ul>{draft.objectives.filter((objective) => objective.trim()).map((objective, index) => <li key={`${index}-${objective}`}>{objective.trim()}</li>)}</ul> : <p>Aún no hay objetivos.</p>}<h4>Habilidades requeridas</h4><p>{draft.requiredSkillIds.map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean).join(", ") || "Sin habilidades requeridas"}</p>{draft.optionalSkillIds.length ? <><h4>Habilidades optativas</h4><p>{draft.optionalSkillIds.map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean).join(", ") || "Sin habilidades optativas"}</p></> : null}
      {draft.missionRubric?.criteria.length ? <><h4>{draft.missionRubric.title || "Rúbrica de la misión"}</h4><ul>{draft.missionRubric.criteria.map((criterion) => <li key={criterion.id}>{criterion.title || "Criterio sin nombre"} · {criterion.weight}/100{criterion.description ? ` — ${criterion.description}` : ""}</li>)}</ul></> : <p>Aún no hay criterios de rúbrica.</p>}
      {draft.deliverables.length ? <><h4>Entregas</h4><ol>{draft.deliverables.map((deliverable) => <li key={deliverable.id}>{deliverable.title || `Entrega ${deliverable.order}`} · {deliverable.type === "proposal" ? "Propuesta" : deliverable.type === "progress" ? "Avance" : "Final"}{deliverable.dueDate ? ` · Fecha: ${deliverable.dueDate}` : " · Sin fecha límite"}{deliverable.requirements.filter(Boolean).length ? <ul>{deliverable.requirements.filter(Boolean).map((requirement, index) => <li key={`${deliverable.id}-${index}`}>{requirement}</li>)}</ul> : null}<p>Criterios: {deliverable.criterionIds.map((id) => draft.missionRubric?.criteria.find((criterion) => criterion.id === id)?.title).filter(Boolean).join(", ") || "Sin criterios asignados"}</p></li>)}</ol></> : <p>Aún no hay entregas configuradas.</p>}
    </article></section> : null}
    {loading ? <p role="status">Cargando misiones del aula…</p> : assignments.length ? <ul className="assignments-panel__list">{assignments.map((assignment) => { const publicationValid = assignment.draft ? AssignmentPublicationSchema.safeParse(assignment.draft).success : false; return <li key={assignment.id}><article><div><h3>{assignment.draft?.title ?? assignment.versions.at(-1)?.title ?? "Misión sin título"}</h3><p>{assignment.publishedVersion ? `Versión publicada ${assignment.publishedVersion}` : "Borrador sin publicar"}{assignment.publishedVersion && assignment.publishedVersion < assignment.draftVersion ? " · Hay cambios sin publicar" : ""}</p></div><div className="assignments-panel__actions"><button type="button" className="assignments-panel__secondary" onClick={() => startEdit(assignment)} disabled={busy || !missionPlanAvailable || !assignment.draft}>Editar borrador</button><button type="button" onClick={() => void publish(assignment)} disabled={busy || !missionPlanAvailable || !assignment.draft || !publicationValid}>Publicar</button></div>
      {assignment.draft && !AssignmentPublicationSchema.safeParse(assignment.draft).success ? <p className="assignments-panel__hint">Completa la rúbrica propia y configura al menos dos entregas antes de publicar.</p> : null}
      {assignment.versions.length ? <details className="assignments-panel__published-versions"><summary>Revisar versiones publicadas</summary><ul>{assignment.versions.map((version) => <li key={version.id}><section aria-label={`Versión publicada ${version.version}`}><p className="assignments-panel__eyebrow">Versión publicada {version.version} · Contexto Mentor v{version.mentorContextVersion}</p><h4>{version.title}</h4><p>{version.instructions}</p><h5>Objetivos</h5><ul>{version.objectives.map((objective, index) => <li key={`${index}-${objective}`}>{objective}</li>)}</ul><h5>Habilidades requeridas</h5><ul>{version.requiredSkills.map((snapshotSkill) => <li key={snapshotSkill.id}><strong>{snapshotSkill.name}</strong>{snapshotSkill.description ? ` — ${snapshotSkill.description}` : ""}</li>)}</ul>{version.optionalSkills.length ? <><h5>Habilidades optativas</h5><ul>{version.optionalSkills.map((snapshotSkill) => <li key={snapshotSkill.id}><strong>{snapshotSkill.name}</strong>{snapshotSkill.description ? ` — ${snapshotSkill.description}` : ""}</li>)}</ul></> : null}
        {version.missionRubric ? <><h5>{version.missionRubric.title}</h5><ul>{version.missionRubric.criteria.map((criterion) => <li key={criterion.id}><strong>{criterion.title}</strong> · {criterion.weight}/100 — {criterion.description}</li>)}</ul></> : null}
        {(version.deliverables ?? []).length ? <><h5>Entregas</h5><ol>{(version.deliverables ?? []).map((deliverable) => <li key={deliverable.id}><strong>{deliverable.title}</strong> · {deliverable.type === "proposal" ? "Propuesta" : deliverable.type === "progress" ? "Avance" : "Final"}{deliverable.dueDate ? ` · ${deliverable.dueDate}` : " · Sin fecha"}<ul>{deliverable.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><p>Criterios: {deliverable.criterionIds.map((id) => version.missionRubric?.criteria.find((criterion) => criterion.id === id)?.title).filter(Boolean).join(", ")}</p></li>)}</ol></> : <p>Esta versión histórica no contiene entregas configuradas.</p>}
        </section></li>)}</ul></details> : null}
    </article></li>; })}</ul> : !loadError && !isCreating ? <p className="assignments-panel__empty">Aún no hay misiones en esta aula.</p> : null}
  </section>;
}

function AssignmentSkillSnapshotList({ label, skills }: { label: string; skills: StudentAssignment["requiredSkills"] }) {
  return <section className="student-assignments__skill-group" aria-label={label}>
    <h4>{label}</h4>
    <ul>{skills.map((skill) => <li key={skill.id}>
      <strong>{skill.name}</strong>
      {skill.description ? <details className="student-assignments__skill-description">
        <summary aria-label={`Ver descripción de ${skill.name}`}>Ver descripción</summary>
        <p>{skill.description}</p>
      </details> : null}
    </li>)}</ul>
  </section>;
}

export function StudentAssignmentsList({
  assignments,
  proposals = [],
  proposalsLoading = true,
  proposalsError = false,
  onRetryProposals,
  onContinueProposal,
  onStartProposal,
}: {
  assignments: StudentAssignment[];
  proposals?: ProposalDraftResponse[];
  proposalsLoading?: boolean;
  proposalsError?: boolean;
  onRetryProposals?: () => void;
  onContinueProposal?: (proposal: ProposalDraftResponse) => void;
  onStartProposal?: (assignment: StudentAssignment) => void;
}) {
  const recentProposals = [...proposals].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return <section className="student-assignments" aria-labelledby="student-assignments-title">
    <h2 id="student-assignments-title">Misiones del aula</h2>
    {assignments.length ? <ul>{assignments.map((assignment) => <li key={assignment.id}>
      <article>
        <p className="assignments-panel__eyebrow">{assignment.classroomTitle} · {assignment.subject}</p>
        <p className="student-assignments__mission-version">Misión publicada v{assignment.version} · Contexto Mentor v{assignment.mentorContextVersion}</p>
        <h3>{assignment.title}</h3>
        <p>{assignment.instructions}</p>
        {assignment.missionPlanVersion === 0 ? <p role="status">El servidor aún no informa la rúbrica ni las entregas versionadas de esta misión. Puedes continuar tu propuesta; vuelve a cargar el aula después de actualizar el servicio.</p> : null}
        <h4>Objetivos</h4>
        <ul>{assignment.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
        <AssignmentSkillSnapshotList label="Habilidades requeridas" skills={assignment.requiredSkills} />
        {assignment.optionalSkills.length ? <AssignmentSkillSnapshotList label="Habilidades optativas" skills={assignment.optionalSkills} /> : null}
        {assignment.missionRubric ? <section className="student-assignments__mission-rubric" aria-label={assignment.missionRubric.title}><h4>{assignment.missionRubric.title}</h4><ul>{assignment.missionRubric.criteria.map((criterion) => <li key={criterion.id}><strong>{criterion.title}</strong> · {criterion.weight}/100<p>{criterion.description}</p></li>)}</ul></section> : assignment.missionPlanVersion === 1 ? <p>Esta versión histórica no contiene una rúbrica propia de misión.</p> : null}
        {(assignment.deliverables ?? []).length ? <section className="student-assignments__deliverables" aria-label="Entregas de la misión"><h4>Entregas del proyecto</h4><ol>{(assignment.deliverables ?? []).map((deliverable) => <li key={deliverable.id}><strong>{deliverable.title}</strong> · {deliverable.type === "proposal" ? "Propuesta" : deliverable.type === "progress" ? "Avance" : "Final"}{deliverable.dueDate ? ` · ${deliverable.dueDate}` : " · Sin fecha"}<ul>{deliverable.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><p>Criterios: {deliverable.criterionIds.map((id) => assignment.missionRubric?.criteria.find((criterion) => criterion.id === id)?.title).filter(Boolean).join(", ")}</p></li>)}</ol></section> : assignment.missionPlanVersion === 1 ? <p>Esta versión histórica no contiene entregas configuradas.</p> : null}
        <details className="student-assignments__context">
          <summary>Contexto para tu propuesta · versión {assignment.mentorContext.version}</summary>
          <div>
            <p><strong>{assignment.mentorContext.config.theme}</strong></p>
            <p>{assignment.mentorContext.config.assignment}</p>
            <p>Nivel esperado: {assignment.mentorContext.config.expectedLevel}</p>
            {assignment.mentorContext.config.requirements.length ? <><h4>Requisitos de la misión y del aula</h4><ul>{assignment.mentorContext.config.requirements.map((requirement, index) => <li key={`${index}-${requirement}`}>{requirement}</li>)}</ul></> : null}
          </div>
        </details>
        {proposalsLoading ? <p role="status">Espera mientras consultamos tus propuestas antes de iniciar.</p> : proposalsError ? <div role="alert"><p>No pudimos consultar tus propuestas. Para evitar duplicados, vuelve a intentarlo antes de iniciar.</p>{onRetryProposals ? <button type="button" onClick={onRetryProposals}>Reintentar propuestas</button> : null}</div> : (() => {
          const linkedProposal = recentProposals.find((proposal) => proposal.assignmentVersionId === assignment.id);
          return linkedProposal
            ? <button type="button" aria-label={`Abrir propuesta vinculada: ${assignment.title}`} disabled={!onContinueProposal} onClick={() => onContinueProposal?.(linkedProposal)}>Abrir propuesta vinculada</button>
            : <button type="button" aria-label={`Iniciar propuesta: ${assignment.title}`} disabled={!onStartProposal} onClick={() => onStartProposal?.(assignment)}>Iniciar propuesta</button>;
        })()}
      </article>
    </li>)}</ul> : <p className="assignments-panel__empty">Tu docente aún no ha publicado misiones en esta aula.</p>}
  </section>;
}
