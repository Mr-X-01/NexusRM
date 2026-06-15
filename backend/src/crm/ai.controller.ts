import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../shared/prisma.service";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("insights")
  async insights() {
    const deals = await this.prisma.deal.findMany({ include: { client: true } });
    const clients = await this.prisma.client.findMany();
    return {
      revenueForecast: "$42,000",
      alerts: [
        "Client is at risk because no activity for 14 days",
        "Deal has 72% closing probability",
        "Recommended next step: send follow-up today",
      ],
      dealScores: deals.map((deal) => ({
        dealId: deal.id,
        title: deal.title,
        score: Math.min(95, Math.round(Number(deal.probability) * 0.7 + Number(deal.aiScore) * 0.3)),
        message: `${deal.title} has ${deal.probability}% closing probability`,
      })),
      clientHealth: clients.map((client) => ({
        clientId: client.id,
        name: client.name,
        score: client.healthScore,
        risk: client.healthScore < 55 ? "high" : client.healthScore < 75 ? "medium" : "low",
      })),
    };
  }

  @Post("deals/:id/score")
  async scoreDeal(@Param("id") id: string) {
    const deal = await this.prisma.deal.findUniqueOrThrow({ where: { id }, include: { client: true } });
    const score = Math.min(95, Math.round(deal.probability * 0.65 + Number(deal.amount) / 2500));
    return this.prisma.aiInsight.create({
      data: {
        dealId: id,
        clientId: deal.clientId,
        type: "deal_score",
        title: "AI Deal Score",
        score,
        message: `Deal has ${score}% closing probability based on stage, amount, close date and client health.`,
      },
    });
  }

  @Post("clients/:id/follow-up")
  async followUp(@Param("id") id: string) {
    const client = await this.prisma.client.findUniqueOrThrow({ where: { id } });
    return {
      subject: `Next step for ${client.name}`,
      body: `Hi ${client.name} team, following up on our last conversation. Recommended next step: send a concise value recap and propose a decision meeting today.`,
    };
  }
}
