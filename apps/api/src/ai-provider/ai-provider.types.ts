export interface AiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AiResponse {
  text: string;
  provider: 'google' | 'openrouter';
}

export class AiUnavailableError extends Error {
  constructor(public readonly reason: string) {
    super(`AI unavailable: ${reason}`);
  }
}
