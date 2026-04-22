import { TeacherGuard } from './teacher.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';

describe('TeacherGuard', () => {
  let guard: TeacherGuard;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    guard = new TeacherGuard(mockPool as Pool);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return false if no user is on request', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should throw ForbiddenException if user is not a teacher', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-1' } }),
      }),
    } as unknown as ExecutionContext;

    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ role: 'student' }] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if user is a teacher', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'teacher-1' } }),
      }),
    } as unknown as ExecutionContext;

    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ role: 'teacher' }] });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
