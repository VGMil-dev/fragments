import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const FOOD_COST = 20; // ACH per feeding

@Injectable()
export class EconomyService {
  constructor(@Inject('DB_POOL') private pool: Pool) {}

  async getBalance(userId: string): Promise<{ balance: number; level: number }> {
    const { rows: [row] } = await this.pool.query(
      'SELECT ach_balance, level FROM lumen_progress WHERE user_id = $1',
      [userId],
    );
    return { balance: row?.ach_balance ?? 0, level: row?.level ?? 1 };
  }

  async feedLumen(userId: string, cost = FOOD_COST): Promise<{ newBalance: number; newLevel: number }> {
    const { balance } = await this.getBalance(userId);
    if (balance < cost) throw new Error('ACH insuficiente');

    await this.pool.query(
      `INSERT INTO ach_transaction (user_id, amount, reason) VALUES ($1, $2, 'feed_lumen')`,
      [userId, -cost],
    );

    const { rows: [updated] } = await this.pool.query(
      `INSERT INTO lumen_progress (user_id, ach_balance, level)
       VALUES ($1, $2, 2)
       ON CONFLICT (user_id) DO UPDATE
         SET ach_balance = lumen_progress.ach_balance - $3,
             level       = lumen_progress.level + 1,
             updated_at  = NOW()
       RETURNING ach_balance, level`,
      [userId, 0 - cost, cost],
    );

    return { newBalance: updated.ach_balance, newLevel: updated.level };
  }
}
