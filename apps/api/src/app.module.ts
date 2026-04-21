import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { SettingsModule } from "./settings/settings.module";
import { ChallengesModule } from "./challenges/challenges.module";
import { HintsModule } from "./hints/hints.module";

@Module({
  imports: [DatabaseModule, AuthModule, SettingsModule, ChallengesModule, HintsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
