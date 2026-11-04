const encoder = new TextEncoder();

function pdfEscape(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, "?").replace(/([\\()])/g, "\\$1");
}

/** Small dependency-free PDF renderer; output is generated per request and never persisted. */
export function createPdfRenderer() {
  return {
    async render(report: string): Promise<Uint8Array> {
      const lines = report.split(/\r?\n/).map(pdfEscape);
      const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 60)) }, (_, index) => lines.slice(index * 60, (index + 1) * 60));
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ...pages.flatMap((page) => {
          const commands = page.map((line, index) => `BT /F1 10 Tf 48 ${760 - index * 12} Td (${line}) Tj ET`).join("\n");
          return [
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 0 0 R >>",
            `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}\nendstream`,
          ];
        }),
      ];
      for (let index = 0; index < pages.length; index += 1) {
        objects[3 + index * 2] = objects[3 + index * 2]!.replace("/Contents 0 0 R", `/Contents ${5 + index * 2} 0 R`);
      }
      let body = "%PDF-1.4\n";
      const offsets = [0];
      for (const [index, object] of objects.entries()) {
        offsets.push(encoder.encode(body).length);
        body += `${index + 1} 0 obj\n${object}\nendobj\n`;
      }
      const xrefOffset = encoder.encode(body).length;
      body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
      return encoder.encode(body);
    },
  };
}
