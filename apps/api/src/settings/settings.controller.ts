import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SettingsService } from './settings.service';

@Controller('api/v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('api-keys')
  getStatus(@Req() req: Request) {
    const userId = (req as any).user?.id ?? 'anonymous';
    return this.settingsService.getKeysStatus(userId);
  }

  @Post('api-keys')
  saveKeys(
    @Body('googleKey') googleKey: string | null,
    @Body('openRouterKey') openRouterKey: string | null,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id ?? 'anonymous';
    return this.settingsService.saveKeys(userId, googleKey ?? null, openRouterKey ?? null);
  }
}
