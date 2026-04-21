import { Injectable } from '@nestjs/common';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { EncryptedKeys } from '../settings/settings.service';

export interface EvaluationResult {
  passed: boolean;
  feedback: string;
}

@Injectable()
export class PhaseEvaluatorService {
  constructor(private readonly ai: AiProviderService) {}

  async evaluateConceptual(
    keys: EncryptedKeys,
    studentAnswer: string,
    rubric: string,
    question: string,
  ): Promise<EvaluationResult> {
    const prompt = `Eres un evaluador de respuestas de programación para estudiantes principiantes.

Pregunta: ${question}
Rúbrica (criterios mínimos que debe cumplir): ${rubric}
Respuesta del estudiante: ${studentAnswer}

Evalúa si la respuesta cumple los criterios de la rúbrica. Responde SOLO con:
- "APROBADO: [razón breve]" si cumple los criterios mínimos
- "REVISAR: [qué falta específicamente]" si no los cumple

Sé generoso con principiantes: no exijas perfección, solo comprensión básica.`;

    const response = await this.ai.generate(keys.googleKeyEnc, keys.openRouterKeyEnc, prompt);
    return {
      passed: response.text.startsWith('APROBADO'),
      feedback: response.text,
    };
  }
}
