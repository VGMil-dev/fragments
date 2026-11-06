import JSZip from "jszip";
import type { ProposalDraftFields } from "./proposal-validation";

export const MAX_MENTOR_DOCX_BYTES = 2 * 1024 * 1024;
export const MAX_MENTOR_DOCX_EXPANDED_BYTES = 8 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 128;
const MAX_EXTRACTED_TEXT_CHARS = 20_000;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_MAIN_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export type MentorDocxImportErrorCode =
  | "unsupported"
  | "too-large"
  | "too-large-expanded"
  | "invalid"
  | "unsafe-content"
  | "empty-document";

export class MentorDocxImportError extends Error {
  constructor(readonly code: MentorDocxImportErrorCode, message: string) {
    super(message);
    this.name = "MentorDocxImportError";
  }
}

export interface MentorDocxImportResult {
  fields: ProposalDraftFields;
  hasAnswers: boolean;
}

interface ZipEntrySummary {
  name: string;
  compressedSize: number;
  expandedSize: number;
}

function invalidDocument(): MentorDocxImportError {
  return new MentorDocxImportError("invalid", "El archivo no es un DOCX válido. Descarga la plantilla y vuelve a intentarlo.");
}

function requireBytes(view: DataView, offset: number, length: number, end = view.byteLength): void {
  if (offset < 0 || length < 0 || offset + length > end || offset + length > view.byteLength) throw invalidDocument();
}

function decodeZipName(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw invalidDocument();
  }
}

function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Resultado de archivo inválido."));
    reader.readAsArrayBuffer(file);
  });
}

/** Inspect ZIP headers before any library expands document parts. */
function inspectZip(buffer: ArrayBuffer): ZipEntrySummary[] {
  const view = new DataView(buffer);
  if (view.byteLength < 22) throw invalidDocument();

  const eocdSignature = 0x06054b50;
  const minEocd = Math.max(0, view.byteLength - 22 - 0xffff);
  let eocd = -1;
  for (let offset = view.byteLength - 22; offset >= minEocd; offset -= 1) {
    if (view.getUint32(offset, true) !== eocdSignature) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + 22 + commentLength === view.byteLength) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw invalidDocument();

  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw invalidDocument();
  }
  if (entryCount < 2 || entryCount > MAX_ZIP_ENTRIES || centralOffset + centralSize !== eocd) throw invalidDocument();

  const summaries: ZipEntrySummary[] = [];
  const seen = new Set<string>();
  let expandedTotal = 0;
  let position = centralOffset;
  const centralEnd = centralOffset + centralSize;
  for (let index = 0; index < entryCount; index += 1) {
    requireBytes(view, position, 46, centralEnd);
    if (view.getUint32(position, true) !== 0x02014b50) throw invalidDocument();

    const flags = view.getUint16(position + 8, true);
    const method = view.getUint16(position + 10, true);
    const compressedSize = view.getUint32(position + 20, true);
    const expandedSize = view.getUint32(position + 24, true);
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const startDisk = view.getUint16(position + 34, true);
    const localOffset = view.getUint32(position + 42, true);
    const recordLength = 46 + nameLength + extraLength + commentLength;
    requireBytes(view, position, recordLength, centralEnd);

    if ((flags & 1) !== 0 || startDisk !== 0 || compressedSize === 0xffffffff || expandedSize === 0xffffffff || localOffset === 0xffffffff || (method !== 0 && method !== 8)) {
      throw invalidDocument();
    }
    const name = decodeZipName(new Uint8Array(buffer, position + 46, nameLength));
    const pathParts = name.replace(/\\/g, "/").split("/");
    if (!name || name.startsWith("/") || pathParts.includes("..") || /[\u0000-\u001f]/.test(name) || seen.has(name)) throw invalidDocument();
    seen.add(name);

    const lowerName = name.toLowerCase();
    if (lowerName.endsWith("vbaproject.bin") || lowerName.includes("/embeddings/") || lowerName.includes("/activex/")) {
      throw new MentorDocxImportError("unsafe-content", "El documento incluye macros u objetos incrustados que Mentor no admite.");
    }

    expandedTotal += expandedSize;
    if (expandedSize > MAX_MENTOR_DOCX_EXPANDED_BYTES || expandedTotal > MAX_MENTOR_DOCX_EXPANDED_BYTES) {
      throw new MentorDocxImportError("too-large-expanded", "El contenido descomprimido supera el límite seguro de 8 MB.");
    }

    requireBytes(view, localOffset, 30, centralOffset);
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw invalidDocument();
    const localFlags = view.getUint16(localOffset + 6, true);
    const localMethod = view.getUint16(localOffset + 8, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const localRecordLength = 30 + localNameLength + localExtraLength;
    requireBytes(view, localOffset, localRecordLength, centralOffset);
    const localName = decodeZipName(new Uint8Array(buffer, localOffset + 30, localNameLength));
    if (localName !== name || localFlags !== flags || localMethod !== method || localOffset + localRecordLength + compressedSize > centralOffset) throw invalidDocument();

    summaries.push({ name, compressedSize, expandedSize });
    position += recordLength;
  }
  if (position !== centralEnd) throw invalidDocument();

  const names = new Set(summaries.map((entry) => entry.name));
  if (!names.has("[Content_Types].xml") || !names.has("word/document.xml")) throw invalidDocument();
  return summaries;
}

function parseXml(source: string): XMLDocument {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror")) throw invalidDocument();
  return document;
}

function validateDocxParts(contentTypesXml: string, documentXml: string): void {
  const contentTypes = parseXml(contentTypesXml);
  if (contentTypes.documentElement.localName !== "Types" || contentTypes.documentElement.namespaceURI !== CONTENT_TYPES_NS) throw invalidDocument();
  const mainPart = Array.from(contentTypes.getElementsByTagNameNS(CONTENT_TYPES_NS, "Override"))
    .find((entry) => entry.getAttribute("PartName") === "/word/document.xml");
  const type = mainPart?.getAttribute("ContentType") ?? "";
  if (type.includes("macroEnabled") || type.includes("vbaProject")) {
    throw new MentorDocxImportError("unsafe-content", "Mentor solo admite documentos DOCX sin macros.");
  }
  if (type !== DOCX_MAIN_CONTENT_TYPE) throw invalidDocument();

  const document = parseXml(documentXml);
  if (document.documentElement.localName !== "document" || document.documentElement.namespaceURI !== WORD_NS || document.getElementsByTagNameNS(WORD_NS, "body").length === 0) {
    throw invalidDocument();
  }
}

function normalizedText(value: string | null): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

const knownTemplatePrompts = [
  /^Nombre y apellido$/i,
  /^Curso$/i,
  /^Título breve del proyecto$/i,
  /^dd\/mm\/aaaa$/i,
  /^En mi institución \/ comunidad ocurre que \.\.\.$/i,
  /^¿A quién afecta y quién usará la aplicación\?$/i,
  /^¿Cómo sabes que ocurre\? Experiencia, observación o ejemplo, sin inventar estadísticas\.$/i,
  /^Crearé una aplicación móvil que permita \.\.\.$/i,
  /^Verbo en infinitivo \+ qué se mejorará \+ para quién\.$/i,
  /^Funcionalidad [1-3]$/i,
  /^Acción observable$/i,
  /^\d+\. Abre la aplicación \.\.\./i,
  /^Pantalla [1-3]$/i,
  /^Qué puede hacer aquí el usuario$/i,
  /^Lo mínimo para demostrar que funciona\.$/i,
  /^Integraciones, pagos, IA, notificaciones, autenticación, etc\. si no son necesarias\.$/i,
  /^Ej\. No sé manejar fechas → revisar documentación y probar un caso pequeño\.$/i,
  /^¿En qué cambia respecto de otras soluciones similares\?$/i,
  /^Cuando el usuario \.\.\. entonces la app debe \.\.\.$/i,
  /^Quiero resolver\.\.\. mediante una app que\.\.\. para\.\.\. La primera versión permitirá\.\.\.$/i,
  /^Sección a mejorar \/ cambio realizado \/ motivo$/i,
  /^Esta plantilla prepara la propuesta\./i,
];

function cleanAnswer(value: string | null): string {
  const text = normalizedText(value);
  if (!text || /^_+$/.test(text)) return "";
  if (knownTemplatePrompts.some((pattern) => pattern.test(text))) return "";
  const bracketed = text.match(/^\[(.*)\]$/s);
  if (!bracketed) return text;
  const answer = (bracketed[1] ?? "").trim();
  if (!answer || knownTemplatePrompts.some((pattern) => pattern.test(answer))) return "";
  return answer;
}

function isHeadingOrLabel(value: string): boolean {
  const text = normalizedText(value).replace(/:$/, "");
  return knownLabels.has(text) || /^(?:ALCANCE Y VIABILIDAD|DIFERENCIACIÓN Y REVISIÓN|INSTRUCCIONES\b|Antes de enviar:)/i.test(text);
}

const knownLabels = new Set([
  "Estudiante", "Curso / paralelo", "Nombre provisional", "Fecha", "Problema concreto", "Personas beneficiarias", "Evidencia u observación inicial",
  "Descripción de la solución", "Objetivo general", "Prioridad", "Funcionalidad", "Qué podrá hacer el usuario", "Escenario principal", "Pantalla", "Propósito",
  "Sí incluiré en el MVP", "No incluiré todavía", "Mayor dificultad y cómo la abordaré", "Diferenciación", "Comprobación 1", "Comprobación 2",
  "Mi propuesta en 3–5 líneas", "Qué ajustaré después de la evaluación",
]);

function sectionMap(html: string): Map<string, Element[]> {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const textLength = parsed.body.textContent?.length ?? 0;
  if (textLength > MAX_EXTRACTED_TEXT_CHARS) throw new MentorDocxImportError("too-large-expanded", "El texto extraído supera el límite seguro para Mentor.");

  const sections = new Map<string, Element[]>();
  let current: Element[] | undefined;
  for (const child of Array.from(parsed.body.children)) {
    if (/^H[1-3]$/.test(child.tagName)) {
      const match = normalizedText(child.textContent).match(/^(\d{2})\s+/);
      if (match) {
        current = [];
        sections.set(match[1]!, current);
        continue;
      }
    }
    current?.push(child);
  }
  return sections;
}

function tableField(section: Element[], label: string): string {
  for (const node of section) {
    if (node.tagName !== "TABLE") continue;
    for (const row of Array.from(node.querySelectorAll("tr"))) {
      const cells = Array.from(row.children).filter((child) => child.tagName === "TD" || child.tagName === "TH");
      const labelIndex = cells.findIndex((cell) => normalizedText(cell.textContent).replace(/:$/, "") === label);
      const answerCell = cells[labelIndex + 1];
      if (labelIndex >= 0 && answerCell) return cleanAnswer(answerCell.textContent);
    }
  }
  return "";
}

function labeledField(section: Element[] | undefined, label: string): string {
  if (!section) return "";
  const fromTable = tableField(section, label);
  if (fromTable) return fromTable;

  for (let index = 0; index < section.length; index += 1) {
    const node = section[index];
    if (!node || node.tagName !== "P") continue;
    const line = normalizedText(node.textContent).replace(/:$/, "");
    if (line !== label) continue;

    const answers: string[] = [];
    for (let next = index + 1; next < section.length; next += 1) {
      const following = section[next];
      if (!following) break;
      if (following.tagName === "TABLE" || /^H[1-3]$/.test(following.tagName)) break;
      const text = normalizedText(following.textContent);
      if (!text) continue;
      if (isHeadingOrLabel(text)) break;
      const answer = cleanAnswer(text);
      if (answer) answers.push(answer);
    }
    return answers.join("\n");
  }
  return "";
}

function tableRows(section: Element[] | undefined, headers: string[]): string[][] {
  if (!section) return [];
  for (const node of section) {
    if (node.tagName !== "TABLE") continue;
    const rows = Array.from(node.querySelectorAll("tr"));
    const first = rows[0] ? Array.from(rows[0].children).map((cell) => normalizedText(cell.textContent)) : [];
    if (!headers.every((header) => first.includes(header))) continue;
    return rows.slice(1).map((row) => Array.from(row.children).map((cell) => cleanAnswer(cell.textContent)));
  }
  return [];
}

function checkedSkills(section: Element[] | undefined): string[] {
  if (!section) return [];
  const skills: string[] = [];
  for (const node of section) {
    if (node.tagName !== "P") continue;
    const text = normalizedText(node.textContent);
    const checked = text.match(/^(?:☒|☑|✓|✔|\[x\])\s*(.+)$/i);
    if (checked?.[1]) skills.push(checked[1].trim());
  }
  return skills;
}

function labeledLines(entries: Array<[string, string]>): string {
  return entries.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
}

function mapProposalFields(sections: Map<string, Element[]>): ProposalDraftFields {
  const general = sections.get("01");
  const problemSection = sections.get("02");
  const solutionSection = sections.get("03");
  const featuresSection = sections.get("04");
  const scenarioSection = sections.get("05");
  const screensSection = sections.get("06");
  const skillsSection = sections.get("07");
  const scopeSection = sections.get("08");
  const riskSection = sections.get("09");
  const differentiationSection = sections.get("10");
  const checksSection = sections.get("11");
  const summarySection = sections.get("12");
  const improvementSection = sections.get("13");

  const featureRows = tableRows(featuresSection, ["Prioridad", "Funcionalidad", "Qué podrá hacer el usuario"]);
  const features = featureRows.map(([priority, name, action]) => {
    const feature = [name, action].filter(Boolean).join(" — ");
    return feature ? `${priority ? `${priority}. ` : ""}${feature}` : "";
  }).filter(Boolean);
  const screenRows = tableRows(screensSection, ["Pantalla", "Propósito"]);
  const screens = screenRows.map(([screen, purpose]) => screen || purpose ? `${screen || "Pantalla"}: ${purpose}` : "").filter(Boolean);
  const checks = ["Comprobación 1", "Comprobación 2"].map((label) => labeledField(checksSection, label)).filter(Boolean);

  const solution = labeledLines([
    ["Descripción de la solución", labeledField(solutionSection, "Descripción de la solución")],
    ["Funcionalidades principales", features.join("\n")],
    ["Recorrido de uso", labeledField(scenarioSection, "Escenario principal")],
    ["Pantallas previstas", screens.join("\n")],
    ["Diferenciación", labeledField(differentiationSection, "Diferenciación")],
    ["Comprobaciones", checks.join("\n")],
    ["Resumen", labeledField(summarySection, "Mi propuesta en 3–5 líneas")],
    ["Mejora posterior", labeledField(improvementSection, "Qué ajustaré después de la evaluación")],
  ]);

  return {
    title: labeledField(general, "Nombre provisional"),
    problem: labeledLines([
      ["Problema concreto", labeledField(problemSection, "Problema concreto")],
      ["Personas beneficiarias", labeledField(problemSection, "Personas beneficiarias")],
      ["Evidencia inicial", labeledField(problemSection, "Evidencia u observación inicial")],
    ]),
    solution,
    goals: labeledField(solutionSection, "Objetivo general"),
    skills: checkedSkills(skillsSection).join("\n"),
    scope: labeledLines([
      ["Sí incluiré en el MVP", labeledField(scopeSection, "Sí incluiré en el MVP")],
      ["No incluiré todavía", labeledField(scopeSection, "No incluiré todavía")],
    ]),
    constraints: labeledLines([
      ["Riesgo y plan", labeledField(riskSection, "Mayor dificultad y cómo la abordaré")],
    ]),
  };
}

export async function importMentorDocx(file: File): Promise<MentorDocxImportResult> {
  if (!/\.docx$/i.test(file.name)) {
    throw new MentorDocxImportError("unsupported", "Selecciona un archivo DOCX (.docx). Los documentos de Word antiguos no son compatibles.");
  }
  if (file.size > MAX_MENTOR_DOCX_BYTES) {
    throw new MentorDocxImportError("too-large", "El archivo supera el límite de 2 MB.");
  }
  if (file.size === 0) throw invalidDocument();

  try {
    const buffer = await readFileBuffer(file);
    if (buffer.byteLength !== file.size) throw invalidDocument();
    const entries = inspectZip(buffer);
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    const contentTypesPart = zip.file("[Content_Types].xml");
    const documentPart = zip.file("word/document.xml");
    if (!contentTypesPart || !documentPart) throw invalidDocument();
    const contentTypes = await contentTypesPart.async("string");
    const documentXml = await documentPart.async("string");
    validateDocxParts(contentTypes, documentXml);
    if (entries.some((entry) => entry.name.toLowerCase().includes("vbaproject"))) {
      throw new MentorDocxImportError("unsafe-content", "Mentor solo admite documentos DOCX sin macros.");
    }

    const mammoth = (await import("mammoth/mammoth.browser.js")).default;
    const converted = await mammoth.convertToHtml({ arrayBuffer: buffer });
    if (converted.messages.some((message) => message.type === "error")) throw invalidDocument();
    const sections = sectionMap(converted.value);
    const fields = mapProposalFields(sections);
    const hasAnswers = Object.values(fields).some((value) => value.trim().length > 0);
    return { fields, hasAnswers };
  } catch (error) {
    if (error instanceof MentorDocxImportError) throw error;
    throw invalidDocument();
  }
}
