import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
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

  @Post("deals/:id/rescue")
  async rescueDeal(@Param("id") id: string) {
    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id },
      include: {
        client: { include: { activities: { orderBy: { createdAt: "desc" }, take: 1 } } },
      },
    });

    const lastActivityAt = deal.client.activities[0]?.createdAt ?? deal.updatedAt;
    const daysSinceActivity = Math.max(0, Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000));
    const plan = this.buildRescuePlan(deal, daysSinceActivity);
    const enrichedEmail = await this.draftRescueEmail(deal, plan);
    const emailDraft = enrichedEmail.body;

    const insight = await this.prisma.aiInsight.create({
      data: {
        dealId: deal.id,
        clientId: deal.clientId,
        type: "deal_rescue",
        title: "AI план спасения сделки",
        score: plan.closeProbability,
        message: `${plan.riskReason} Рекомендованный шаг: ${plan.nextSteps[0]}`,
      },
    });

    await this.prisma.activity.create({
      data: {
        type: "ai_rescue",
        summary: `AI создал план спасения сделки «${deal.title}» (${deal.client.name}): ${plan.nextSteps[0]}`,
        clientId: deal.clientId,
      },
    });

    return {
      insightId: insight.id,
      dealId: deal.id,
      dealTitle: deal.title,
      clientId: deal.clientId,
      clientName: deal.client.name,
      riskLevel: plan.riskLevel,
      riskReason: plan.riskReason,
      closeProbability: plan.closeProbability,
      daysSinceActivity,
      nextSteps: plan.nextSteps,
      emailSubject: enrichedEmail.subject,
      emailDraft,
      emailModel: enrichedEmail.model,
      recommendedTask: {
        title: plan.nextSteps[0],
        priority: plan.riskLevel === "high" ? "urgent" : "high",
        clientId: deal.clientId,
        dealId: deal.id,
      },
    };
  }

  private buildRescuePlan(
    deal: { stage: string; probability: number; amount: Prisma.Decimal; riskLevel: string; client: { name: string; healthScore: number } },
    daysSinceActivity: number,
  ) {
    const reasons: string[] = [];
    if (daysSinceActivity >= 7) reasons.push(`нет активности ${daysSinceActivity} дн.`);
    if (deal.probability < 60) reasons.push(`низкая вероятность закрытия (${deal.probability}%)`);
    if (["Lead", "Contacted"].includes(deal.stage)) reasons.push(`сделка застряла на ранней стадии (${deal.stage})`);
    if (deal.client.healthScore < 60) reasons.push(`низкий health score клиента (${deal.client.healthScore})`);
    if (deal.riskLevel === "high") reasons.push("риск помечен как высокий");
    if (!reasons.length) reasons.push("сделка требует подтверждения следующего шага, чтобы не потерять темп");

    const closeProbability = Math.max(5, Math.min(95, Math.round(
      deal.probability * 0.6 + deal.client.healthScore * 0.3 - daysSinceActivity * 1.5,
    )));
    const riskLevel: "low" | "medium" | "high" =
      closeProbability >= 65 ? "low" : closeProbability >= 40 ? "medium" : "high";

    const nextSteps = [
      `Отправить follow-up клиенту ${deal.client.name} сегодня`,
      "Предложить короткий 15-минутный созвон для снятия блокеров",
      deal.stage === "Lead" || deal.stage === "Contacted"
        ? "Согласовать критерии решения и продвинуть сделку на стадию Proposal"
        : "Подтвердить бюджет и сроки закрытия в текущем квартале",
    ];

    return {
      riskLevel,
      riskReason: `Сделка в зоне риска: ${reasons.join(", ")}.`,
      closeProbability,
      nextSteps,
    };
  }

  private async draftRescueEmail(
    deal: { title: string; client: { name: string } },
    plan: { nextSteps: string[] },
  ) {
    const subject = `Следующий шаг по проекту «${deal.title}»`;
    const fallbackBody = [
      `Здравствуйте, команда ${deal.client.name}!`,
      "",
      `Хотел свериться по проекту «${deal.title}». Чтобы двигаться дальше, предлагаю короткий созвон на 15 минут на этой неделе — обсудим открытые вопросы и план запуска.`,
      "",
      "Подскажите, какой день и время вам удобны? Со своей стороны подготовлю краткое резюме ценности и следующие шаги.",
      "",
      "С уважением,",
      "команда NexusRM",
    ].join("\n");

    const apiKey = this.config.get<string>("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return { subject, body: fallbackBody, model: "local-rescue-fallback" };
    }

    const baseUrl = this.config.get<string>("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com";
    const model = this.config.get<string>("DEEPSEEK_MODEL") ?? "deepseek-v4-pro";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Ты sales-менеджер CRM NexusRM. Напиши короткое деловое письмо клиенту по-русски (4-6 предложений), вежливое, без воды, с конкретным следующим шагом и призывом к короткому созвону. Верни только текст письма.",
          },
          {
            role: "user",
            content: `Сделка: «${deal.title}», клиент: ${deal.client.name}. Рекомендованные шаги: ${plan.nextSteps.join("; ")}.`,
          },
        ],
        temperature: 0.4,
        max_tokens: 500,
        stream: false,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      return { subject, body: fallbackBody, model: "local-rescue-fallback" };
    }
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const body = payload.choices?.[0]?.message?.content?.trim();
    return body ? { subject, body, model } : { subject, body: fallbackBody, model: "local-rescue-fallback" };
  }

  @Public()
  @Post("chat")
  async chat(@Body() dto: AiChatDto) {
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
    const fallback = () => ({
      answer: this.localCrmAnswer(dto.message, context),
      model: "local-crm-fallback",
    });
    const apiKey = this.config.get<string>("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return fallback();
    }

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
    }).catch(() => null);

    if (!response) {
      return fallback();
    }
    if (response.status === 401 || response.status === 403) {
      return fallback();
    }
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

  private localCrmAnswer(
    question: string,
    context: {
      name: string;
      status: string;
      healthScore: number;
      deals: { title: string; stage: string; amount: Prisma.Decimal; probability: number; riskLevel: string }[];
      tasks: { title: string; status: string; priority: string }[];
    }[],
  ) {
    const riskyClients = context.filter((client) => client.healthScore < 75);
    const riskyDeals = context.flatMap((client) =>
      client.deals
        .filter((deal) => deal.riskLevel === "high" || deal.probability < 60)
        .map((deal) => `${deal.title} (${client.name}, ${deal.probability}%, риск ${deal.riskLevel})`),
    );
    const nextClient = riskyClients[0] ?? context[0];
    const focus = riskyDeals[0] ?? (nextClient ? `${nextClient.name}: проверьте ближайшие задачи и следующий контакт` : "Добавьте клиентов и сделки, чтобы получить точные рекомендации");

    return [
      "AI работает в локальном CRM-режиме, потому что внешний DeepSeek ключ недоступен или отклонён провайдером.",
      `По запросу "${question}" главный фокус: ${focus}.`,
      riskyClients.length
        ? `Клиенты с риском: ${riskyClients.map((client) => `${client.name} (${client.healthScore})`).join(", ")}.`
        : "Клиенты с критичным health score не найдены.",
      "Рекомендация: назначьте ответственного, создайте follow-up на сегодня и обновите вероятность сделки после контакта.",
    ].join(" ");
  }
}
