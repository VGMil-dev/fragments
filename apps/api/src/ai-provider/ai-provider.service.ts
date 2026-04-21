import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { EncryptionService } from './encryption.service';
import { AiResponse, AiUnavailableError } from './ai-provider.types';

const GOOGLE_MODEL = 'gemini-2.5-flash';
const OPENROUTER_MODEL = 'google/gemini-flash-1.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class AiProviderService {
  constructor(private readonly encryption: EncryptionService) {}

  /**
   * Generate text using the student's own API keys.
   * Tries Google AI Studio first, falls back to OpenRouter.
   *
   * @param encryptedGoogleKey — encrypted Google AI Studio key from DB (or null)
   * @param encryptedOpenRouterKey — encrypted OpenRouter key from DB (or null)
   * @param prompt — the prompt to send
   */
  async generate(
    encryptedGoogleKey: string | null,
    encryptedOpenRouterKey: string | null,
    prompt: string,
  ): Promise<AiResponse> {
    if (encryptedGoogleKey) {
      const googleKey = this.encryption.decrypt(encryptedGoogleKey);
      if (googleKey) {
        try {
          return await this.callGoogle(googleKey, prompt);
        } catch {
          // fall through to OpenRouter
        }
      }
    }

    if (encryptedOpenRouterKey) {
      const orKey = this.encryption.decrypt(encryptedOpenRouterKey);
      if (orKey) {
        try {
          return await this.callOpenRouter(orKey, prompt);
        } catch {
          // fall through to error
        }
      }
    }

    throw new AiUnavailableError(
      encryptedGoogleKey || encryptedOpenRouterKey
        ? 'Both providers failed'
        : 'No API keys configured — student must add keys in Settings',
    );
  }

  private async callGoogle(apiKey: string, prompt: string): Promise<AiResponse> {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GOOGLE_MODEL,
      contents: prompt,
    });
    const text = response.text ?? '';
    if (!text) throw new Error('Empty response from Google AI');
    return { text, provider: 'google' };
  }

  private async callOpenRouter(apiKey: string, prompt: string): Promise<AiResponse> {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://fragments.app',
        'X-Title': 'Fragments',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response from OpenRouter');
    return { text, provider: 'openrouter' };
  }
}
