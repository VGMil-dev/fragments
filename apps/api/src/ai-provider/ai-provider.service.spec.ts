import { AiProviderService } from './ai-provider.service';
import { EncryptionService } from './encryption.service';

const mockEncryption = {
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
};

describe('AiProviderService', () => {
  let service: AiProviderService;

  beforeEach(() => {
    service = new AiProviderService(mockEncryption as unknown as EncryptionService);
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('uses Google AI when google key is available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Pista: revisa tu bucle.' }] } }],
      }),
    });

    const result = await service.generate('enc:AIzaSyTest', null, 'Dame una pista');
    expect(result.text).toBe('Pista: revisa tu bucle.');
    expect(result.provider).toBe('google');
  });

  it('falls back to OpenRouter when Google fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 429 }) // Google fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Pista desde OpenRouter.' } }],
        }),
      });

    const result = await service.generate('enc:AIzaSyTest', 'enc:sk-or-test', 'Dame una pista');
    expect(result.text).toBe('Pista desde OpenRouter.');
    expect(result.provider).toBe('openrouter');
  });

  it('throws AiUnavailableError when both providers fail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    await expect(
      service.generate('enc:AIzaSyTest', 'enc:sk-or-test', 'Dame una pista'),
    ).rejects.toThrow('AI unavailable');
  });

  it('throws AiUnavailableError when no keys are set', async () => {
    await expect(
      service.generate(null, null, 'Dame una pista'),
    ).rejects.toThrow('AI unavailable');
  });
});
