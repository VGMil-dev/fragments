import { runCli, type CliOptions } from "repomix";
import type { RepomixRunCli } from "./repomix.repository-packer.js";

/** Runs the pinned Repomix library only on a server-created tree with config and ignore files disabled. */
export const runOfficialRepomix: RepomixRunCli = async (input) => {
  input.signal?.throwIfAborted();
  const options: CliOptions = {
    output: input.outputFilePath,
    style: input.outputFormat,
    outputFilePathStyle: "target-relative",
    include: input.include.join(","),
    tokenBudget: input.maxOutputTokens,
    quiet: true,
    fileSummary: false,
    directoryStructure: false,
    gitignore: false,
    dotIgnore: false,
    defaultPatterns: true,
    skipLocalConfig: true,
    skipGlobalConfig: true,
    remoteTrustConfig: false,
    confineToBaseDir: true,
    securityCheck: true,
  };
  const result = await runCli([input.cwd], input.cwd, options);
  input.signal?.throwIfAborted();
  if (!result || result.packResult.totalTokens > input.maxOutputTokens) throw new Error("La salida Repomix supera el límite de tokens.");
};
