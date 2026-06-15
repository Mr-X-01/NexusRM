import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Roles } from "../security/roles.decorator";
import { PrismaService } from "../shared/prisma.service";

@ApiTags("admin")
@ApiBearerAuth()
@Roles(Role.admin)
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("users")
  users() {
    return this.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } });
  }

  @Get("audit-logs")
  auditLogs() {
    return this.prisma.auditLog.findMany({ include: { actor: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }
}
