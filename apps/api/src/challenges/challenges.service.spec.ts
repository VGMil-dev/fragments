import { Test, TestingModule } from '@nestjs/testing';
import { ChallengesService } from './challenges.service';

const mockPool = {
  query: jest.fn(),
};

describe('ChallengesService', () => {
  let service: ChallengesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesService,
        { provide: 'DB_POOL', useValue: mockPool },
      ],
    }).compile();
    service = module.get<ChallengesService>(ChallengesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns list of challenges without phases', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'abc', title: 'Test', description: 'Desc', difficulty: 1, topic: 'loops', created_at: new Date() },
        ],
      });
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('returns null when challenge does not exist', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // challenge query
        .mockResolvedValueOnce({ rows: [] }); // phases query
      const result = await service.findOne('nonexistent-id');
      expect(result).toBeNull();
    });
  });
});
