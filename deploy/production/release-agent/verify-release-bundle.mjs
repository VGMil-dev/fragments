import { readdir, readFile } from "node:fs/promises";

const expectedTag = process.env.EXPECTED_TAG;
const expectedSha = process.env.EXPECTED_SHA;
if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(expectedTag ?? "")) {
  throw new Error("EXPECTED_TAG no es una versión estable válida.");
}
if (!/^[0-9a-f]{40}$/.test(expectedSha ?? "")) {
  throw new Error("EXPECTED_SHA debe ser un SHA completo.");
}

const directory = "apps/web/dist/assets";
const bundles = (await readdir(directory)).filter((file) => file.endsWith(".js"));
if (bundles.length === 0) throw new Error("No se encontraron bundles JavaScript.");
const contents = await Promise.all(bundles.map((file) => readFile(`${directory}/${file}`, "utf8")));
const markers = contents.join("\n");
const metadataPattern = new RegExp(`version:[\"']${expectedTag}[\"'],commit:[\"']${expectedSha}[\"']`);
if (!metadataPattern.test(markers)) {
  throw new Error("El bundle no contiene la versión y el SHA exactos verificados.");
}
console.log(JSON.stringify({ version: expectedTag, commit: expectedSha, bundles: bundles.length }));
