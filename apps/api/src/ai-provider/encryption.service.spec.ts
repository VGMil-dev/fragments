import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex
    service = new EncryptionService();
  });

  it('encrypt and decrypt round-trip returns original string', () => {
    const original = 'AIzaSyTest1234567890';
    const encrypted = service.encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(service.decrypt(encrypted)).toBe(original);
  });

  it('two encryptions of the same string produce different ciphertexts (IV randomness)', () => {
    const key = 'sk-test-key';
    expect(service.encrypt(key)).not.toBe(service.encrypt(key));
  });

  it('decrypt returns null for tampered ciphertext', () => {
    const encrypted = service.encrypt('valid-key');
    const tampered = encrypted.slice(0, -4) + 'xxxx';
    expect(service.decrypt(tampered)).toBeNull();
  });
});
