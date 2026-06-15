import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Public } from "../security/public.decorator";
import { PublicApiKeyGuard } from "../security/public-api-key.guard";
import { PrismaService } from "../shared/prisma.service";
import { PublicLeadDto, PublicWebhookDto, CreateTaskDto } from "./dto";

@ApiTags("public-api")
@ApiSecurity("public-api-key")
@Public()
@UseGuards(PublicApiKeyGuard)
@Controller("public")
export class PublicApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("leads")
  async createLead(@Body() dto: PublicLeadDto) {
    const client = await this.prisma.client.create({
      data: {
        name: dto.company,
        industry: "Imported Lead",
        status: "new",
        tags: ["public-api"],
        contacts: { create: { name: "Inbound lead", email: dto.email, isPrimary: true } },
        activities: { create: { type: "lead", summary: dto.message ?? "Lead submitted through public API" } },
      },
    });
    return { id: client.id, status: "accepted" };
  }

  @Get("clients")
  clients() {
    return this.prisma.client.findMany({ select: { id: true, name: true, status: true, industry: true, tags: true } });
  }

  @Post("tasks")
  createTask(@Body() dto: CreateTaskDto) {
    return this.prisma.task.create({ data: { ...dto, dueDate: new Date(dto.dueDate) } });
  }

  @Get("deals")
  deals() {
    return this.prisma.deal.findMany({ select: { id: true, title: true, stage: true, amount: true, closeDate: true, probability: true } });
  }

  @Post("webhooks")
  createWebhook(@Body() dto: PublicWebhookDto) {
    return this.prisma.webhook.create({ data: { url: dto.url, event: dto.event } });
  }
}
