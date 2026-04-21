import { PistonService } from './piston.service';

describe('PistonService', () => {
  let service: PistonService;

  beforeEach(() => {
    service = new PistonService();
    jest.clearAllMocks();
  });

  it('returns passed=true when all test cases match', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ run: { stdout: 'positivo\n', stderr: '' } }),
    }) as jest.Mock;

    const result = await service.run(
      'python',
      'print("positivo")',
      [{ stdin: '5', expected_stdout: 'positivo' }],
    );

    expect(result.passed).toBe(true);
    expect(result.results[0].passed).toBe(true);
  });

  it('returns passed=false when output does not match', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ run: { stdout: 'wrong\n', stderr: '' } }),
    }) as jest.Mock;

    const result = await service.run(
      'python',
      'print("wrong")',
      [{ stdin: '5', expected_stdout: 'positivo' }],
    );

    expect(result.passed).toBe(false);
    expect(result.results[0].passed).toBe(false);
    expect(result.results[0].actual).toBe('wrong');
  });
});
