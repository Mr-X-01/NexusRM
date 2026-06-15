import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AiController } from "./crm/ai.controller";
import { AdminController } from "./crm/admin.controller";
import { AuthController } from "./crm/auth.controller";
import { AuthService } from "./crm/auth.service";
import { ClientsController } from "./crm/clients.controller";
import { DealsController } from "./crm/deals.controller";
import { PublicApiController } from "./crm/public-api.controller";
import { TasksController } from "./crm/tasks.controller";
import { JwtAuthGuard } from "./security/jwt-auth.guard";
import { PublicApiKeyGuard } from "./security/public-api-key.guard";
import { RateLimitGuard } from "./security/rate-limit.guard";
import { PrismaService } from "./shared/prisma.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
  ],
  controllers: [AuthController, ClientsController, DealsController, TasksController, AiController, PublicApiController, AdminController],
  providers: [
    PrismaService,
    PublicApiKeyGuard,
    AuthService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
