import { Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { EconomyService } from './economy.service';

@Controller('api/v1/economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('balance')
  getBalance(@Req() req: Request) {
    const userId = (req as any).user?.id ?? 'anonymous';
    return this.economyService.getBalance(userId);
  }

  @Post('feed')
  feedLumen(@Req() req: Request) {
    const userId = (req as any).user?.id ?? 'anonymous';
    return this.economyService.feedLumen(userId);
  }
}
