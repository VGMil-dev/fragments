import { Test } from '@nestjs/testing';
import { EconomyService } from './economy.service';

const mockPool = { query: jest.fn() };

describe('EconomyService', () => {
  let service: EconomyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EconomyService, { provide: 'DB_POOL', useValue: mockPool }],
    }).compile();
    service = module.get<EconomyService>(EconomyService);
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('returns 0 when no lumen_progress row exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await service.getBalance('user-1');
      expect(result.balance).toBe(0);
      expect(result.level).toBe(1);
    });

    it('returns existing balance', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ ach_balance: 150, level: 3 }] });
      const result = await service.getBalance('user-1');
      expect(result.balance).toBe(150);
      expect(result.level).toBe(3);
    });
  });

  describe('feedLumen', () => {
    it('throws when balance is insufficient', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ ach_balance: 5, level: 1 }] });
      await expect(service.feedLumen('user-1', 20)).rejects.toThrow('ACH insuficiente');
    });

    it('deducts balance and increments level when affordable', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ach_balance: 50, level: 2 }] })  // getBalance
        .mockResolvedValueOnce({ rows: [] })  // transaction insert
        .mockResolvedValueOnce({ rows: [{ ach_balance: 30, level: 3 }] }); // updated row

      const result = await service.feedLumen('user-1', 20);
      expect(result.newBalance).toBe(30);
      expect(result.newLevel).toBe(3);
    });
  });
});
