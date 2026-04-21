import { Pool, QueryResult } from 'pg';

export type DbPool = Pool;
export type DbRow = Record<string, unknown>;
export type { QueryResult };
