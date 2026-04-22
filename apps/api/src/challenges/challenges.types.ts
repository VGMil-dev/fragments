export interface ChallengeHint {
  id: string;
  level: number;
  content: string;
}

export interface ChallengePhase {
  id: string;
  order_index: number;
  kind: 'conceptual' | 'code';
  content: Record<string, unknown>;
  hints: ChallengeHint[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  topic: string;
  status: 'draft' | 'published';
  teacher_id: string | null;
  created_at: string;
  phases: ChallengePhase[];
}

export interface CreateChallengeDto {
  title: string;
  description: string;
  difficulty: number;
  topic: string;
  phases: Array<{
    kind: 'conceptual' | 'code';
    content: Record<string, unknown>;
    hints?: Array<{ level: number; content: string }>;
  }>;
}

export interface UpdateChallengeDto extends Partial<CreateChallengeDto> {
  status?: 'draft' | 'published';
}
