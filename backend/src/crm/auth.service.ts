import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../shared/prisma.service";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException("Пользователь уже существует");

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role ?? Role.manager,
        passwordHash: await bcrypt.hash(dto.password, 12),
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Неверный email или пароль");
    }
    if (user.status === UserStatus.disabled) {
      throw new UnauthorizedException("Аккаунт отключен администратором");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const payload = this.jwt.verify(refreshToken, { secret: this.config.get("JWT_REFRESH_SECRET") ?? "dev-refresh-secret" });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshHash || !(await bcrypt.compare(refreshToken, user.refreshHash))) {
      throw new UnauthorizedException("Недействительный refresh token");
    }
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshHash: null } });
    return { ok: true };
  }

  private async issueTokens(user: { id: string; email: string; name: string; role: Role; title?: string | null; department?: string | null; status?: UserStatus }) {
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET") ?? "dev-access-secret",
      expiresIn: this.config.get("ACCESS_TOKEN_TTL") ?? "15m",
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get("JWT_REFRESH_SECRET") ?? "dev-refresh-secret",
      expiresIn: this.config.get("REFRESH_TOKEN_TTL") ?? "7d",
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshHash: await bcrypt.hash(refreshToken, 12) } });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        title: user.title,
        department: user.department,
      },
      accessToken,
      refreshToken,
    };
  }
}
