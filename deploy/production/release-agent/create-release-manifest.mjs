import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";

const [archivePath, manifestPath, runId, tag, tagObject, commit] = process.argv.slice(2);
const shaPattern = /^[0-9a-f]{40}$/;
if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag ?? "")) throw new Error("Tag semántica inválida.");
if (!shaPattern.test(tagObject ?? "") || !shaPattern.test(commit ?? "")) throw new Error("Se requieren objetos Git SHA-1 completos.");
if (!/^\d+$/.test(runId ?? "")) throw new Error("Identificador de workflow inválido.");
const { size } = await stat(archivePath);
if (size < 1 || size > 2_000_000_000) throw new Error("El archivo de imágenes debe estar entre 1 byte y 2 GB.");
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
const manifest = {
  schemaVersion: 1,
  repository: "VGMil-dev/fragments",
  repositoryId: 1214734354,
  runId,
  tag,
  tagObject,
  commit,
  platform: "linux/arm64",
  archiveName: "fragments-images.tar.gz",
  archiveSha256: hash.digest("hex"),
  images: {
    api: `fragments-api:sha-${commit}`,
    web: `fragments-web:sha-${commit}`,
  },
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ tag, commit, archiveBytes: size, archiveSha256: manifest.archiveSha256 }));
