import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { EncryptionService } from '../ai-provider/encryption.service';

export interface KeysStatus {
  hasGoogleKey: boolean;
  hasOpenRouterKey: boolean;
}

export interface EncryptedKeys {
  googleKeyEnc: string | null;
  openRouterKeyEnc: string | null;
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject('DB_POOL') private pool: Pool,
    private encryption: EncryptionService,
  ) {}

  async getKeysStatus(userId: string): Promise<KeysStatus> {
    const { rows: [row] } = await this.pool.query(
      'SELECT google_ai_key_enc, openrouter_key_enc FROM user_api_keys WHERE user_id = $1',
      [userId],
    );
    return {
      hasGoogleKey: !!row?.google_ai_key_enc,
      hasOpenRouterKey: !!row?.openrouter_key_enc,
    };
  }

  async getEncryptedKeys(userId: string): Promise<EncryptedKeys> {
    const { rows: [row] } = await this.pool.query(
      'SELECT google_ai_key_enc, openrouter_key_enc FROM user_api_keys WHERE user_id = $1',
      [userId],
    );
    return {
      googleKeyEnc: row?.google_ai_key_enc ?? null,
      openRouterKeyEnc: row?.openrouter_key_enc ?? null,
    };
  }

  async saveKeys(
    userId: string,
    googleKey: string | null,
    openRouterKey: string | null,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_api_keys (user_id, google_ai_key_enc, openrouter_key_enc)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET google_ai_key_enc   = EXCLUDED.google_ai_key_enc,
             openrouter_key_enc  = EXCLUDED.openrouter_key_enc,
             updated_at          = NOW()`,
      [
        userId,
        googleKey ? this.encryption.encrypt(googleKey) : null,
        openRouterKey ? this.encryption.encrypt(openRouterKey) : null,
      ],
    );
  }
}
