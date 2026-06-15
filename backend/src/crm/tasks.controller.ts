import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../security/current-user.decorator";
import { Roles } from "../security/roles.decorator";
import { PrismaService } from "../shared/prisma.service";
import { CreateTaskDto, UpdateTaskDto } from "./dto";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("tasks")
export class TasksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.task.findMany({ include: { assignee: true, client: true, deal: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });
  }

  @Roles(Role.admin, Role.manager)
  @Post()
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: CurrentUser) {
    const task = await this.prisma.task.create({ data: { ...dto, dueDate: new Date(dto.dueDate) } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "task.create", entity: "Task", entityId: task.id } });
    return task;
  }

  @Roles(Role.admin, Role.manager)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: CurrentUser) {
    const task = await this.prisma.task.update({ where: { id }, data: { ...dto, dueDate: new Date(dto.dueDate) } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "task.update", entity: "Task", entityId: id } });
    return task;
  }

  @Roles(Role.admin)
  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUser) {
    await this.prisma.task.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { actorId: user.sub, action: "task.delete", entity: "Task", entityId: id } });
    return { ok: true };
  }
}
