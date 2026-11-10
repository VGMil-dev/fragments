import type { PdfRenderer } from "./service.js";
import type { MentorEvaluator } from "./service.js";

export function createLocalMentorEvaluator(): MentorEvaluator {
  return {
    async evaluate({ proposal, proposalDigest, config }) {
      const completeness = [proposal.problem, proposal.solution, proposal.scope].filter((value) => value.trim().length >= 35).length;
      return {
        findings: config.criteria.map((criterion, index) => ({
          criterionId: criterion.id,
          status: completeness === 3 || index < completeness ? "verified" as const : "not_verified" as const,
          evidence: [{ source: "proposal" as const, field: index === 0 ? "problem" : index === 1 ? "solution" : "scope", digest: proposalDigest }],
          reason: completeness === 3
            ? "La propuesta incluye suficiente detalle para orientar una primera revisión."
            : "Amplía esta parte para que una persona pueda valorar mejor el trabajo.",
          guidanceLevel: 1,
        })),
        limitations: ["Evaluación demostrativa local; no utiliza un modelo de IA."],
        modelId: "fake/local-heuristic-v1",
        inputDigest: proposalDigest,
        guidance: [
          "¿Qué resultado pequeño podrías mostrar al finalizar la primera semana?",
          "¿Cómo comprobarás que tu solución ayuda a la persona que describiste?",
        ],
        similarities: [],
      };
    },
  };
}

export function createMinimalPdfRenderer(): PdfRenderer {
  return {
    version: "fragments-minimal-pdf-1",
    async render({ submission, proposal }) {
      const lines = [
        "Fragments - Entrega Mentor",
        `Proyecto: ${proposal.title}`,
        `Puntaje orientativo: ${submission.score}/100`,
        `Rubrica: ${submission.rubricVersion}`,
        `Verificacion: ${submission.verificationCode}`,
        "",
        "Problema",
        proposal.problem,
        "",
        "Solucion",
        proposal.solution,
        "",
        "Objetivos",
        ...proposal.goals.map((goal) => `- ${goal}`),
        "",
        "Alcance",
        proposal.scope,
        "",
        "Restricciones",
        ...(proposal.constraints.length ? proposal.constraints.map((constraint) => `- ${constraint}`) : ["Sin restricciones declaradas."]),
      ].flatMap(wrapPdfLine).slice(0, 54);
      const commands = ["BT", "/F1 10 Tf", "48 756 Td", "12 TL", ...lines.map((line, index) => `${index === 0 ? "" : "T* "}(${escapePdfText(line)}) Tj`), "ET"].join("\n");
      const stream = Buffer.from(commands, "ascii");
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${stream.length} >>\nstream\n${stream.toString("ascii")}\nendstream`,
      ];
      const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "ascii")];
      const offsets = [0];
      for (let index = 0; index < objects.length; index++) {
        offsets.push(Buffer.concat(chunks).length);
        chunks.push(Buffer.from(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`, "ascii"));
      }
      const xrefOffset = Buffer.concat(chunks).length;
      const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f ", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)];
      chunks.push(Buffer.from(`${xref.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, "ascii"));
      return Buffer.concat(chunks);
    },
  };
}

function wrapPdfLine(value: string): string[] {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
  const chunks: string[] = [];
  for (let remaining = normalized; remaining.length > 88; remaining = remaining.slice(88)) chunks.push(remaining.slice(0, 88));
  chunks.push(normalized.slice(0, 88));
  return chunks;
}

function escapePdfText(value: string): string { return value.replace(/[\\()]/g, "\\$&"); }
