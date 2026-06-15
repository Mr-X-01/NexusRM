import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Prisma, Role } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { CurrentUser } from "../security/current-user.decorator";
import { Roles } from "../security/roles.decorator";
import { PrismaService } from "../shared/prisma.service";
import { CreateApiKeyDto, UpdateUserDto, WorkspaceSettingsDto } from "./dto";

const defaultWorkspaceSettings = {
  workspaceName: "NexusRM",
  timezone: "Europe/Moscow",
  currency: "USD",
  aiEnabled: true,
  publicApiEnabled: true,
  registrationEnabled: false,
  defaultRole: Role.manager,
};

@ApiTags("admin")
@ApiBearerAuth()
@Roles(Role.admin)
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("overview")
  @ApiOperation({ summary: "Сводка админ-панели: пользователи, CRM-объекты, интеграции и аудит" })
  async overview() {
    const [users, clients, deals, tasks, apiKeys, webhooks, auditLogs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.client.count(),
      this.prisma.deal.count(),
      this.prisma.task.count(),
      this.prisma.apiKey.count(),
      this.prisma.webhook.count(),
      this.prisma.auditLog.count(),
    ]);

    return { users, clients, deals, tasks, apiKeys, webhooks, auditLogs };
  }

  @Get("users")
  @ApiOperation({ summary: "Список пользователей рабочего пространства" })
  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        title: true,
        department: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }

  @Patch("users/:id")
  @ApiOperation({ summary: "Обновить роль, статус и профиль пользователя" })
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, name: true, role: true, status: true, title: true, department: true, phone: true, lastLoginAt: true },
    });
  }

  @Get("settings")
  @ApiOperation({ summary: "Получить системные настройки CRM" })
  async settings() {
    const row = await this.prisma.workspaceSetting.findUnique({ where: { key: "workspace" } });
    const value = typeof row?.value === "object" && row.value !== null && !Array.isArray(row.value) ? row.value : {};
    return { ...defaultWorkspaceSettings, ...value };
  }

  @Patch("settings")
  @ApiOperation({ summary: "Обновить системные настройки CRM" })
  async updateSettings(@Body() dto: WorkspaceSettingsDto, @CurrentUser() user: CurrentUser) {
    const next = { ...(await this.settings()), ...dto };
    const row = await this.prisma.workspaceSetting.upsert({
      where: { key: "workspace" },
      update: { value: next as Prisma.InputJsonObject },
      create: { key: "workspace", value: next as Prisma.InputJsonObject },
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "admin.settings.update", entity: "workspace", entityId: row.id } });
    return next;
  }

  @Get("api-keys")
  @ApiOperation({ summary: "Список API-ключей без раскрытия секретов" })
  apiKeys() {
    return this.prisma.apiKey.findMany({
      select: { id: true, name: true, prefix: true, isActive: true, createdAt: true, lastUsedAt: true, owner: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post("api-keys")
  @ApiOperation({ summary: "Создать публичный API-ключ. Полный ключ возвращается только один раз" })
  async createApiKey(@Body() dto: CreateApiKeyDto, @CurrentUser() user: CurrentUser) {
    const apiKey = `nxrm_${randomBytes(24).toString("hex")}`;
    const record = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        keyHash: createHash("sha256").update(apiKey).digest("hex"),
        prefix: apiKey.slice(0, 12),
        ownerId: user.sub,
      },
      select: { id: true, name: true, prefix: true, isActive: true, createdAt: true },
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "admin.api_key.create", entity: "api_key", entityId: record.id } });
    return { apiKey, record };
  }

  @Patch("api-keys/:id/toggle")
  @ApiOperation({ summary: "Включить или отключить API-ключ" })
  async toggleApiKey(@Param("id") id: string, @CurrentUser() user: CurrentUser) {
    const current = await this.prisma.apiKey.findUniqueOrThrow({ where: { id } });
    const record = await this.prisma.apiKey.update({ where: { id }, data: { isActive: !current.isActive } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "admin.api_key.toggle", entity: "api_key", entityId: id, metadata: { isActive: record.isActive } } });
    return record;
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Последние события аудита" })
  auditLogs() {
    return this.prisma.auditLog.findMany({ include: { actor: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }
}
