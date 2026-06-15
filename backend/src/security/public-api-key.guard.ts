import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../shared/prisma.service";

@Injectable()
export class PublicApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers["x-api-key"];
    if (!rawKey || Array.isArray(rawKey)) throw new UnauthorizedException("Missing x-api-key");

    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.prisma.apiKey.updateMany({
      where: { keyHash, isActive: true },
      data: { lastUsedAt: new Date() },
    });

    if (!apiKey.count) throw new UnauthorizedException("Invalid public API key");
    return true;
  }
}
