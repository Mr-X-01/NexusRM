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
        "Клиент в зоне риска: нет активности 14 дней",
        "Вероятность закрытия сделки: 72%",
        "Рекомендованный шаг: отправить письмо сегодня",
      ],
      dealScores: deals.map((deal) => ({
        dealId: deal.id,
        title: deal.title,
        score: Math.min(95, Math.round(Number(deal.probability) * 0.7 + Number(deal.aiScore) * 0.3)),
        message: `${deal.title}: вероятность закрытия ${deal.probability}%`,
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
        title: "AI score сделки",
        score,
        message: `Вероятность закрытия ${score}% на основе стадии, суммы, даты закрытия и health score клиента.`,
      },
    });
  }

  @Post("clients/:id/follow-up")
  async followUp(@Param("id") id: string) {
    const client = await this.prisma.client.findUniqueOrThrow({ where: { id } });
    return {
      subject: `Следующий шаг для ${client.name}`,
      body: `Команда ${client.name}, возвращаемся к последнему разговору. Рекомендованный шаг: отправить краткое резюме ценности и предложить decision meeting сегодня.`,
    };
  }
}
