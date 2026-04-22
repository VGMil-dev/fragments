import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { AiProviderModule } from "./ai-provider/ai-provider.module";
import { SettingsModule } from "./settings/settings.module";
import { ChallengesModule } from "./challenges/challenges.module";
import { HintsModule } from "./hints/hints.module";
import { EconomyModule } from "./economy/economy.module";
import { TeacherModule } from "./teacher/teacher.module";
import { AnalyticsModule } from "./analytics/analytics.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AiProviderModule,
    SettingsModule,
    ChallengesModule,
    HintsModule,
    EconomyModule,
    TeacherModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
