const encoder = new TextEncoder();

const winAnsiSpecialCharacters = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

function pdfEscape(text: string): string {
  return Array.from(text, (character) => {
    const codePoint = character.codePointAt(0)!;
    const byte = codePoint >= 0x20 && codePoint <= 0x7e
      ? codePoint
      : codePoint >= 0xa0 && codePoint <= 0xff
        ? codePoint
        : winAnsiSpecialCharacters.get(codePoint) ?? 0x3f;
    if (byte < 0x20 || byte >= 0x7f) return `\\${byte.toString(8).padStart(3, "0")}`;
    return String.fromCharCode(byte).replace(/[\\()]/g, "\\$&");
  }).join("");
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
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
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
