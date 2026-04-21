import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { EncryptionService } from '../ai-provider/encryption.service';

const mockPool = { query: jest.fn() };
const mockEncryption = {
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: 'DB_POOL', useValue: mockPool },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();
    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('getKeysStatus returns hasGoogleKey=false when no row exists', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const result = await service.getKeysStatus('user-1');
    expect(result.hasGoogleKey).toBe(false);
    expect(result.hasOpenRouterKey).toBe(false);
  });

  it('getKeysStatus returns hasGoogleKey=true when key is stored', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ google_ai_key_enc: 'enc:AIzaSy...', openrouter_key_enc: null }],
    });
    const result = await service.getKeysStatus('user-1');
    expect(result.hasGoogleKey).toBe(true);
    expect(result.hasOpenRouterKey).toBe(false);
  });

  it('saveKeys encrypts and upserts both keys', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    await service.saveKeys('user-1', 'AIzaSyReal', 'sk-or-real');
    expect(mockEncryption.encrypt).toHaveBeenCalledWith('AIzaSyReal');
    expect(mockEncryption.encrypt).toHaveBeenCalledWith('sk-or-real');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_api_keys'),
      expect.arrayContaining(['user-1']),
    );
  });
});
