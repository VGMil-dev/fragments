import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Challenge, CreateChallengeDto } from './challenges.types';

@Injectable()
export class ChallengesService {
  constructor(@Inject('DB_POOL') private pool: Pool) {}

  async findAll(teacherId?: string): Promise<Omit<Challenge, 'phases'>[]> {
    if (teacherId) {
      const { rows } = await this.pool.query(
        'SELECT id, title, description, difficulty, topic, status, teacher_id, created_at FROM challenge WHERE teacher_id = $1 OR status = \'published\' ORDER BY difficulty, created_at',
        [teacherId],
      );
      return rows;
    }

    const { rows } = await this.pool.query(
      'SELECT id, title, description, difficulty, topic, status, teacher_id, created_at FROM challenge WHERE status = \'published\' ORDER BY difficulty, created_at',
      undefined,
    );
    return rows;
  }

  async findOne(id: string): Promise<Challenge | null> {
    const { rows: challenges } = await this.pool.query(
      'SELECT id, title, description, difficulty, topic, status, teacher_id, created_at FROM challenge WHERE id = $1',
      [id],
    );
    if (challenges.length === 0) return null;

    const { rows: phases } = await this.pool.query(
      `SELECT p.id, p.order_index, p.kind, p.content,
              json_agg(json_build_object('id', h.id, 'level', h.level, 'content', h.content)
                ORDER BY h.level) FILTER (WHERE h.id IS NOT NULL) AS hints
       FROM challenge_phase p
       LEFT JOIN challenge_hint h ON h.phase_id = p.id
       WHERE p.challenge_id = $1
       GROUP BY p.id
       ORDER BY p.order_index`,
      [id],
    );

    return { ...challenges[0], phases: phases.map(p => ({ ...p, hints: p.hints ?? [] })) };
  }

  async create(dto: CreateChallengeDto, teacherId?: string): Promise<Challenge> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [challenge] } = await client.query(
        'INSERT INTO challenge (title, description, difficulty, topic, teacher_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [dto.title, dto.description, dto.difficulty, dto.topic, teacherId, 'draft'],
      );

      for (let i = 0; i < dto.phases.length; i++) {
        const phase = dto.phases[i];
        const { rows: [phaseRow] } = await client.query(
          'INSERT INTO challenge_phase (challenge_id, order_index, kind, content) VALUES ($1, $2, $3, $4) RETURNING id',
          [challenge.id, i, phase.kind, JSON.stringify(phase.content)],
        );

        if (phase.hints) {
          for (const hint of phase.hints) {
            await client.query(
              'INSERT INTO challenge_hint (phase_id, level, content) VALUES ($1, $2, $3)',
              [phaseRow.id, hint.level, hint.content],
            );
          }
        }
      }

      await client.query('COMMIT');
      return this.findOne(challenge.id) as Promise<Challenge>;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: any): Promise<Challenge> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (dto.title || dto.description || dto.difficulty || dto.topic || dto.status) {
        const fields = [];
        const values = [];
        let idx = 1;
        if (dto.title) { fields.push(`title = $${idx++}`); values.push(dto.title); }
        if (dto.description) { fields.push(`description = $${idx++}`); values.push(dto.description); }
        if (dto.difficulty) { fields.push(`difficulty = $${idx++}`); values.push(dto.difficulty); }
        if (dto.topic) { fields.push(`topic = $${idx++}`); values.push(dto.topic); }
        if (dto.status) { fields.push(`status = $${idx++}`); values.push(dto.status); }
        values.push(id);
        await client.query(`UPDATE challenge SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      }

      if (dto.phases) {
        // Simple strategy: delete and recreate phases
        await client.query('DELETE FROM challenge_phase WHERE challenge_id = $1', [id]);
        for (let i = 0; i < dto.phases.length; i++) {
          const phase = dto.phases[i];
          const { rows: [phaseRow] } = await client.query(
            'INSERT INTO challenge_phase (challenge_id, order_index, kind, content) VALUES ($1, $2, $3, $4) RETURNING id',
            [id, i, phase.kind, JSON.stringify(phase.content)],
          );

          if (phase.hints) {
            for (const hint of phase.hints) {
              await client.query(
                'INSERT INTO challenge_hint (phase_id, level, content) VALUES ($1, $2, $3)',
                [phaseRow.id, hint.level, hint.content],
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return this.findOne(id) as Promise<Challenge>;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM challenge WHERE id = $1', [id]);
  }

  async publish(id: string): Promise<void> {
    await this.pool.query('UPDATE challenge SET status = \'published\' WHERE id = $1', [id]);
  }
}
