import { Injectable } from '@nestjs/common';

export interface TestCase {
  stdin: string;
  expected_stdout: string;
}

export interface RunResult {
  passed: boolean;
  results: Array<{
    passed: boolean;
    expected: string;
    actual: string;
    stderr: string;
  }>;
}

@Injectable()
export class PistonService {
  private readonly pistonUrl = 'https://emkc.org/api/v2/piston/execute';

  async run(language: string, code: string, tests: TestCase[]): Promise<RunResult> {
    const results = await Promise.all(
      tests.map(async (tc) => {
        const res = await fetch(this.pistonUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            version: '*',
            files: [{ name: `solution.${this.ext(language)}`, content: code }],
            stdin: tc.stdin,
          }),
        });

        if (!res.ok) throw new Error(`Piston error: ${res.status}`);

        const data = await res.json();
        const actual = (data.run?.stdout ?? '').trim();
        const expected = tc.expected_stdout.trim();

        return {
          passed: actual === expected,
          expected,
          actual,
          stderr: data.run?.stderr ?? '',
        };
      }),
    );

    return { passed: results.every(r => r.passed), results };
  }

  private ext(language: string): string {
    const map: Record<string, string> = {
      python: 'py', javascript: 'js', typescript: 'ts',
      java: 'java', cpp: 'cpp', c: 'c',
    };
    return map[language] ?? 'txt';
  }
}
