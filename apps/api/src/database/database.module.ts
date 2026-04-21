import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      provide: 'DB_POOL',
      useFactory: () =>
        new Pool({ connectionString: process.env.DATABASE_URL }),
    },
  ],
  exports: ['DB_POOL'],
})
export class DatabaseModule {}
