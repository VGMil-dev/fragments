import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { HintsService } from './hints.service';

@Controller('api/v1/challenges')
export class HintsController {
  constructor(private readonly hintsService: HintsService) {}

  @Post(':challengeId/phases/:phaseId/hint')
  getHint(
    @Param('phaseId') phaseId: string,
    @Body('level') level: number,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id ?? 'anonymous';
    return this.hintsService.getHint(phaseId, userId, level ?? 1);
  }
}
