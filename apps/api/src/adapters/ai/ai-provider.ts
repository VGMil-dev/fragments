import { AiAnalysisSchema, type AiAnalysis } from "../../../../../packages/contracts/src/index.js";

export type AiReviewInput = { packedText: string; rubricVersion: string; inputDigest: string };

/** Structured generation boundary; production Gateway wiring belongs to the platform composition root. */
export interface AiProvider {
  analyze(input: AiReviewInput): Promise<AiAnalysis>;
}

export function createAiProvider(generate: (input: AiReviewInput) => Promise<unknown>): AiProvider {
  return {
    async analyze(input) {
      const analysis = AiAnalysisSchema.parse(await generate(input));
      if (analysis.inputDigest !== input.inputDigest || analysis.rubricVersion !== input.rubricVersion) {
        throw new Error("El proveedor de evaluación respondió con otra entrada o rúbrica.");
      }
      return analysis;
    },
  };
}

/** Labelled local-only provider for offline tests and deterministic eval fixtures. */
export function createFakeAiProvider(response: Omit<AiAnalysis, "rubricVersion" | "inputDigest">): AiProvider {
  return createAiProvider(async (input) => ({ ...response, rubricVersion: input.rubricVersion, inputDigest: input.inputDigest, modelId: `fake:${response.modelId}` }));
}
