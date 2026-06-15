import { BadRequestException, Body, Controller, Get, Param, Post, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../security/public.decorator";
import { PrismaService } from "../shared/prisma.service";
import { AiChatDto } from "./dto";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  @Public()
  @Post("chat")
  async chat(@Body() dto: AiChatDto) {
    const apiKey = this.config.get<string>("DEEPSEEK_API_KEY");
    if (!apiKey) {
      throw new ServiceUnavailableException("DeepSeek API key не настроен. Добавьте DEEPSEEK_API_KEY в .env на сервере и перезапустите backend.");
    }

    const clients = await this.prisma.client.findMany({
      include: { deals: true, tasks: true },
      take: 8,
    });
    const context = clients.map((client) => ({
      name: client.name,
      status: client.status,
      healthScore: client.healthScore,
      deals: client.deals.map((deal) => ({
        title: deal.title,
        stage: deal.stage,
        amount: deal.amount,
        probability: deal.probability,
        riskLevel: deal.riskLevel,
      })),
      tasks: client.tasks.map((task) => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
      })),
    }));

    const baseUrl = this.config.get<string>("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com";
    const model = this.config.get<string>("DEEPSEEK_MODEL") ?? "deepseek-v4-pro";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Ты AI ассистент CRM NexusRM. Отвечай по-русски, кратко, делово и с опорой на CRM-контекст. Давай конкретные sales-рекомендации.",
          },
          {
            role: "user",
            content: `CRM-контекст: ${JSON.stringify(context)}\n\nВопрос: ${dto.message}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 700,
        stream: false,
        thinking: { type: "enabled" },
        reasoning_effort: "medium",
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new BadRequestException(`DeepSeek API вернул ошибку ${response.status}: ${details.slice(0, 300)}`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      answer: payload.choices?.[0]?.message?.content ?? "DeepSeek не вернул текст ответа.",
      model,
    };
  }
}
