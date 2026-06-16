import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../security/current-user.decorator";
import { Roles } from "../security/roles.decorator";
import { PrismaService } from "../shared/prisma.service";
import { CreateDealDto, UpdateDealDto } from "./dto";

@ApiTags("deals")
@ApiBearerAuth()
@Controller("deals")
export class DealsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.deal.findMany({ include: { client: true, tasks: true }, orderBy: { updatedAt: "desc" } });
  }

  @Get("pipeline/summary")
  async pipeline() {
    const deals = await this.prisma.deal.findMany({ include: { client: true } });
    return deals.reduce<Record<string, typeof deals>>((acc, deal) => {
      acc[deal.stage] = [...(acc[deal.stage] ?? []), deal];
      return acc;
    }, {});
  }

  @Roles(Role.admin, Role.manager)
  @Post()
  async create(@Body() dto: CreateDealDto, @CurrentUser() user: CurrentUser) {
    const deal = await this.prisma.deal.create({
      data: { ...dto, closeDate: new Date(dto.closeDate) },
      include: { client: true, tasks: true },
    });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "deal.create", entity: "Deal", entityId: deal.id } });
    return deal;
  }

  @Roles(Role.admin, Role.manager)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateDealDto, @CurrentUser() user: CurrentUser) {
    const data = { ...dto, closeDate: dto.closeDate ? new Date(dto.closeDate) : undefined };
    const deal = await this.prisma.deal.update({ where: { id }, data, include: { client: true, tasks: true } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "deal.update", entity: "Deal", entityId: id } });
    return deal;
  }

  @Roles(Role.admin)
  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUser) {
    await this.prisma.deal.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "deal.delete", entity: "Deal", entityId: id } });
    return { ok: true };
  }
}
