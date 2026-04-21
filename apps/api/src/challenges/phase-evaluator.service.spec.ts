import { PhaseEvaluatorService } from './phase-evaluator.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';

const mockAi = { generate: jest.fn() };

describe('PhaseEvaluatorService', () => {
  let service: PhaseEvaluatorService;

  beforeEach(() => {
    service = new PhaseEvaluatorService(mockAi as unknown as AiProviderService);
    jest.clearAllMocks();
  });

  it('returns passed=true when AI responds with APROBADO', async () => {
    mockAi.generate.mockResolvedValue({
      text: 'APROBADO: La respuesta menciona correctamente condición y bloques.',
      provider: 'google',
    });

    const result = await service.evaluateConceptual(
      { googleKeyEnc: 'enc:key', openRouterKeyEnc: null },
      'Un if/else evalúa una condición y ejecuta un bloque u otro.',
      'Debe mencionar: condición, bloque verdadero, bloque falso',
      '¿Qué hace un if/else?',
    );

    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('APROBADO');
  });

  it('returns passed=false when AI responds with REVISAR', async () => {
    mockAi.generate.mockResolvedValue({
      text: 'REVISAR: La respuesta no menciona el bloque falso (else).',
      provider: 'google',
    });

    const result = await service.evaluateConceptual(
      { googleKeyEnc: 'enc:key', openRouterKeyEnc: null },
      'Un if ejecuta código cuando algo es verdad.',
      'Debe mencionar: condición, bloque verdadero, bloque falso',
      '¿Qué hace un if/else?',
    );

    expect(result.passed).toBe(false);
  });
});
