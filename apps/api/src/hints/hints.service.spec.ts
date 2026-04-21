import { Test } from '@nestjs/testing';
import { HintsService } from './hints.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { SettingsService } from '../settings/settings.service';

const mockPool = { query: jest.fn() };
const mockAi = { generate: jest.fn() };
const mockSettings = { getEncryptedKeys: jest.fn() };

describe('HintsService', () => {
  let service: HintsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HintsService,
        { provide: 'DB_POOL', useValue: mockPool },
        { provide: AiProviderService, useValue: mockAi },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();
    service = module.get<HintsService>(HintsService);
    jest.clearAllMocks();
  });

  it('uses pre-defined hint when one matches the requested level', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'phase-1', kind: 'conceptual', content: { question: 'What is if/else?' } }],
    });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ content: 'Piensa en una decisión diaria.' }],
    });
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // hint_event insert

    const result = await service.getHint('phase-1', 'user-1', 1);

    expect(result.hint).toBe('Piensa en una decisión diaria.');
    expect(mockAi.generate).not.toHaveBeenCalled();
  });

  it('falls back to AI when no pre-defined hint matches', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'phase-1', kind: 'code', content: { starter: 'for i in ...' } }],
    });
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // no pre-defined hint
    mockSettings.getEncryptedKeys.mockResolvedValue({
      googleKeyEnc: 'enc:key', openRouterKeyEnc: null,
    });
    mockAi.generate.mockResolvedValue({ text: 'Prueba usando range()', provider: 'google' });
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // hint_event insert

    const result = await service.getHint('phase-1', 'user-1', 4);

    expect(result.hint).toBe('Prueba usando range()');
    expect(result.source).toBe('ai');
    expect(mockAi.generate).toHaveBeenCalled();
  });
});
