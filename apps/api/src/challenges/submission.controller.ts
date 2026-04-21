import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SubmissionService } from './submission.service';

@Controller('api/v1/challenges')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post(':challengeId/phases/:phaseId/submit')
  submit(
    @Param('phaseId') phaseId: string,
    @Body('content') content: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id ?? 'anonymous';
    return this.submissionService.submit(phaseId, { content, userId });
  }
}
