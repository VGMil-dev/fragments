import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { auth } from '../auth/better-auth';

@Injectable()
export class TeacherGuard implements CanActivate {
  constructor(@Inject('DB_POOL') private pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Attempt to get session if not already attached
    if (!request.user) {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      if (session) {
        request.user = session.user;
      }
    }

    const userId = request.user?.id;
    if (!userId) return false;

    const { rows } = await this.pool.query('SELECT role FROM "user" WHERE id = $1', [userId]);
    
    if (rows[0]?.role !== 'teacher') {
      throw new ForbiddenException('Teacher role required');
    }
    
    return true;
  }
}
