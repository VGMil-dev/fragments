import { createGitHubRestRepositoryReader } from "../../apps/api/src/adapters/github/github-rest-client.js";
import { createRepomixRepositoryPacker } from "../../apps/api/src/adapters/repomix/repomix.repository-packer.js";
import { runOfficialRepomix } from "../../apps/api/src/adapters/repomix/official-runner.js";

const commits = [
  ["A", "1104f4046a8049e7736b14748c9f02d5a9f7a533"],
  ["B", "a66a8da27aec0f2b5a25a3ddd67142688ed8c518"],
  ["C", "e2b54b2a3760b22a509c89a8b1345d0e5f4e1781"],
] as const;

const github = createGitHubRestRepositoryReader(process.env.GITHUB_TOKEN ? { token: process.env.GITHUB_TOKEN } : {});
const packer = createRepomixRepositoryPacker(runOfficialRepomix);

for (const [label, commitSha] of commits) {
  const snapshot = await github.readCommitSnapshot({ owner: "VGMil-dev", repo: "fragments-test-app", commitSha });
  const packed = await packer.pack(snapshot, { maxBytes: 100_000, maxTokens: 20_000 });
  const source = snapshot.files.map((file) => `${file.path}\n${file.content}`).join("\n");
  const feature = {
    formAndList: /FlatList/.test(source) && /TextInput/.test(source),
    requiredValidation: /required|obligator/i.test(source) && /trim\(\)/.test(source),
    nameSearch: /filterLostItems|searchTerm|searchQuery/i.test(source),
    recoveredState: /markLostItemRecovered|recovered|recuperado/i.test(source),
  };
  process.stdout.write(`${JSON.stringify({
    label,
    commitSha,
    files: snapshot.files.length,
    snapshotBytes: snapshot.files.reduce((total, file) => total + Buffer.byteLength(file.content), 0),
    repomixTokens: packed.tokenCount,
    feature,
  })}\n`);
}
