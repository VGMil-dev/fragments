// @vitest-environment jsdom
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importMentorDocx, MentorDocxImportError } from "./docx-import";

const templatePath = resolve(process.cwd(), "public/templates/fragments-mentor-propuesta.docx");
const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function templateBytes(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(templatePath));
}

function docxFile(bytes: Uint8Array, name = "propuesta.docx"): File {
  return new File([new Uint8Array(bytes).buffer], name, { type: docxMime });
}

async function filledTemplate(): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await templateBytes());
  const part = zip.file("word/document.xml");
  if (!part) throw new Error("Official template is missing word/document.xml");
  let xml = await part.async("string");
  const replacements: Array<[string, string]> = [
    ["[Título breve del proyecto]", "[Riego Vecinal]"],
    ["[En mi institución / comunidad ocurre que ...]", "[Las plantas del barrio reciben riego irregular.]"],
    ["[¿A quién afecta y quién usará la aplicación?]", "[Vecinos que cuidan las plantas.]"],
    ["[¿Cómo sabes que ocurre? Experiencia, observación o ejemplo, sin inventar estadísticas.]", "[Observé varias plantas secarse durante una semana.]"],
    ["[Crearé una aplicación móvil que permita ...]", "[Registraré turnos de riego para las plantas.]"],
    ["[Verbo en infinitivo + qué se mejorará + para quién.]", "[Organizar los turnos para cuidar las plantas.]"],
    ["[Funcionalidad 1]", "[Registrar turnos]"],
    ["[Acción observable]", "[La persona guarda un turno.]"],
    ["[Funcionalidad 2]", "[Consultar el calendario]"],
    ["[Acción observable]", "[La persona ve los turnos próximos.]"],
    ["[Funcionalidad 3]", "[Marcar riego]"],
    ["[Acción observable]", "[La persona confirma el riego.]"],
    ["[1. Abre la aplicación ...  2. Selecciona ...  3. Obtiene ...]", "[Abre la app, elige un turno y confirma el riego.]"],
    ["[Pantalla 1]", "[Calendario]"],
    ["[Qué puede hacer aquí el usuario]", "[Revisar los próximos turnos.]"],
    ["[Pantalla 2]", "[Nuevo turno]"],
    ["[Qué puede hacer aquí el usuario]", "[Agregar un horario.]"],
    ["[Pantalla 3]", "[Historial]"],
    ["[Qué puede hacer aquí el usuario]", "[Confirmar los riegos.]"],
    ["☐ React Native con Expo y TypeScript", "☒ React Native con Expo y TypeScript"],
    ["[Lo mínimo para demostrar que funciona.]", "[Registrar turnos y confirmar riegos.]"],
    ["[Integraciones, pagos, IA, notificaciones, autenticación, etc. si no son necesarias.]", "[Pagos y notificaciones automáticas.]"],
    ["[Ej. No sé manejar fechas → revisar documentación y probar un caso pequeño.]", "[Coordinar horarios; probaré primero con tres vecinos.]"],
    ["[¿En qué cambia respecto de otras soluciones similares?]", "[Se organiza por turnos comunitarios.]"],
    ["[Cuando el usuario ... entonces la app debe ...]", "[Cuando confirma un riego, el historial debe mostrarlo.]"],
    ["[Quiero resolver... mediante una app que... para... La primera versión permitirá...]", "[Quiero organizar el riego vecinal con una app de turnos.]"],
    ["[Sección a mejorar / cambio realizado / motivo]", "[Ajustaré el calendario según las pruebas.]"],
  ];
  for (const [placeholder, answer] of replacements) xml = xml.replace(placeholder, answer);
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "uint8array" });
}

describe("importMentorDocx", () => {
  it("reads the official blank template and ignores its prompts and placeholders", async () => {
    const result = await importMentorDocx(docxFile(await templateBytes()));
    expect(result.fields).toEqual({ title: "", problem: "", solution: "", goals: "", skills: "", scope: "", constraints: "" });
    expect(result.hasAnswers).toBe(false);
  });

  it("maps answers from the full template into existing Mentor fields", async () => {
    const result = await importMentorDocx(docxFile(await filledTemplate()));
    expect(result.hasAnswers).toBe(true);
    expect(result.fields.title).toBe("Riego Vecinal");
    expect(result.fields.problem).toContain("Las plantas del barrio reciben riego irregular.");
    expect(result.fields.problem).toContain("Observé varias plantas secarse durante una semana.");
    expect(result.fields.solution).toContain("Registraré turnos de riego para las plantas.");
    expect(result.fields.solution).toContain("Calendario: Revisar los próximos turnos.");
    expect(result.fields.solution).toContain("Cuando confirma un riego, el historial debe mostrarlo.");
    expect(result.fields.goals).toContain("Organizar los turnos para cuidar las plantas.");
    expect(result.fields.skills).toContain("React Native con Expo y TypeScript");
    expect(result.fields.scope).toContain("Registrar turnos y confirmar riegos.");
    expect(result.fields.constraints).toContain("Coordinar horarios");
  });

  it("rejects other extensions and corrupt ZIP files with clear error codes", async () => {
    await expect(importMentorDocx(docxFile(await templateBytes(), "propuesta.zip")))
      .rejects.toMatchObject({ code: "unsupported" });
    await expect(importMentorDocx(docxFile(new TextEncoder().encode("no es un docx"))))
      .rejects.toBeInstanceOf(MentorDocxImportError);
  });

  it("rejects files larger than 2 MB before parsing", async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
    await expect(importMentorDocx(docxFile(bytes))).rejects.toMatchObject({ code: "too-large" });
  });

  it("rejects a ZIP whose expanded content exceeds the limit before extraction", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types />");
    zip.file("word/document.xml", "x".repeat(9 * 1024 * 1024));
    const compressed = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    expect(compressed.byteLength).toBeLessThan(2 * 1024 * 1024);
    await expect(importMentorDocx(docxFile(compressed))).rejects.toMatchObject({ code: "too-large-expanded" });
  });

  it("rejects macro-enabled or embedded object parts", async () => {
    const zip = await JSZip.loadAsync(await templateBytes());
    zip.file("word/embeddings/oleObject1.bin", "payload");
    await expect(importMentorDocx(docxFile(await zip.generateAsync({ type: "uint8array" }))))
      .rejects.toMatchObject({ code: "unsafe-content" });
  });
});
