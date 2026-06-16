import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../security/current-user.decorator";
import { Roles } from "../security/roles.decorator";
import { PrismaService } from "../shared/prisma.service";
import { CreateClientDto, UpdateClientDto } from "./dto";

@ApiTags("clients")
@ApiBearerAuth()
@Controller("clients")
export class ClientsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.client.findMany({
      include: { manager: { select: { id: true, name: true, email: true } }, contacts: true, deals: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  @Get(":id")
  profile(@Param("id") id: string) {
    return this.prisma.client.findUniqueOrThrow({
      where: { id },
      include: { contacts: true, deals: true, tasks: true, notes: true, activities: { orderBy: { createdAt: "desc" } }, insights: true },
    });
  }

  @Roles(Role.admin, Role.manager)
  @Post()
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: CurrentUser) {
    const client = await this.prisma.client.create({
      data: { ...dto, managerId: dto.managerId ?? user.sub },
      include: { manager: { select: { id: true, name: true, email: true } }, contacts: true, deals: true },
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "client.create", entity: "Client", entityId: client.id } });
    return client;
  }

  @Roles(Role.admin, Role.manager)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: CurrentUser) {
    const client = await this.prisma.client.update({
      where: { id },
      data: dto,
      include: { manager: { select: { id: true, name: true, email: true } }, contacts: true, deals: true },
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "client.update", entity: "Client", entityId: id } });
    return client;
  }

  @Roles(Role.admin)
  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUser) {
    await this.prisma.client.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "client.delete", entity: "Client", entityId: id } });
    return { ok: true };
  }
}
