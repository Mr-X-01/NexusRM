export type ClientStatus = "new" | "active" | "at_risk" | "lost";
export type DealStage = "Лид" | "Контакт" | "Предложение" | "Переговоры" | "Выиграна" | "Проиграна";
export type BackendDealStage = "Lead" | "Contacted" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done";

export const stages: DealStage[] = ["Лид", "Контакт", "Предложение", "Переговоры", "Выиграна", "Проиграна"];

export const backendDealStageByUi: Record<DealStage, BackendDealStage> = {
  "Лид": "Lead",
  "Контакт": "Contacted",
  "Предложение": "Proposal",
  "Переговоры": "Negotiation",
  "Выиграна": "Won",
  "Проиграна": "Lost",
};

const uiDealStageByBackend: Record<BackendDealStage, DealStage> = {
  Lead: "Лид",
  Contacted: "Контакт",
  Proposal: "Предложение",
  Negotiation: "Переговоры",
  Won: "Выиграна",
  Lost: "Проиграна",
};

export type CrmClient = {
  id: string;
  name: string;
  industry: string;
  status: ClientStatus;
  tags: string[];
  manager: string;
  managerId?: string;
  healthScore: number;
  contacts: string[];
  lastActivity: string;
  notes: string;
};

export type CrmDeal = {
  id: string;
  title: string;
  client: string;
  clientId: string;
  stage: DealStage;
  amount: number;
  closeDate: string;
  closeDateIso: string;
  probability: number;
  aiScore: number;
  risk: "low" | "medium" | "high" | string;
};

export type CrmTask = {
  id: string;
  title: string;
  client: string;
  clientId?: string;
  dealId?: string;
  due: string;
  dueDateIso: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export type RevenueSeriesPoint = {
  month: string;
  revenue: number | null;
  forecast: number | null;
};

export type DealRescuePlan = {
  insightId: string;
  dealId: string;
  dealTitle: string;
  clientId: string;
  clientName: string;
  riskLevel: "low" | "medium" | "high";
  riskReason: string;
  closeProbability: number;
  daysSinceActivity: number;
  nextSteps: string[];
  emailSubject: string;
  emailDraft: string;
  emailModel: string;
  recommendedTask: {
    title: string;
    priority: TaskPriority;
    clientId: string;
    dealId: string;
  };
};

export type ClientDraft = {
  name: string;
  industry: string;
  tags: string;
  manager: string;
  status: ClientStatus;
};

export type DealDraft = {
  title: string;
  clientId: string;
  stage: DealStage;
  amount: number;
  closeDate: string;
  probability: number;
};

export type TaskDraft = {
  title: string;
  clientId?: string;
  client?: string;
  due: string;
  priority: TaskPriority;
};

type ApiClient = {
  id: string;
  name: string;
  industry: string;
  status?: ClientStatus;
  tags?: string[];
  healthScore?: number;
  managerId?: string | null;
  manager?: { id?: string; name?: string; email?: string } | null;
  contacts?: { name?: string; email?: string }[];
  updatedAt?: string;
};

type ApiDeal = {
  id: string;
  title: string;
  clientId: string;
  client?: { id: string; name: string } | null;
  stage?: BackendDealStage;
  amount: number | string;
  closeDate: string;
  probability?: number;
  aiScore?: number;
  riskLevel?: "low" | "medium" | "high";
};

type ApiTask = {
  id: string;
  title: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate: string;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  dealId?: string | null;
};

export function mapApiClient(client: ApiClient): CrmClient {
  return {
    id: client.id,
    name: client.name,
    industry: client.industry,
    status: client.status ?? "new",
    tags: client.tags ?? [],
    manager: client.manager?.name ?? "Без менеджера",
    managerId: client.manager?.id ?? client.managerId ?? undefined,
    healthScore: client.healthScore ?? 75,
    contacts: client.contacts?.map((contact) => contact.name || contact.email || "Контакт").filter(Boolean) ?? [],
    lastActivity: client.updatedAt ? `Обновлен ${formatDateLabel(client.updatedAt)}` : "Активность пока не зафиксирована",
    notes: "Данные клиента загружены из CRM API.",
  };
}

export function mapApiDeal(deal: ApiDeal): CrmDeal {
  const probability = deal.probability ?? 50;
  return {
    id: deal.id,
    title: deal.title,
    client: deal.client?.name ?? "Клиент не указан",
    clientId: deal.client?.id ?? deal.clientId,
    stage: deal.stage ? uiDealStageByBackend[deal.stage] : "Лид",
    amount: Number(deal.amount) || 0,
    closeDate: formatDateLabel(deal.closeDate),
    closeDateIso: deal.closeDate,
    probability,
    aiScore: deal.aiScore ?? Math.round(probability * 0.9),
    risk: deal.riskLevel ?? (probability >= 60 ? "low" : probability >= 35 ? "medium" : "high"),
  };
}

export function mapApiTask(task: ApiTask): CrmTask {
  return {
    id: task.id,
    title: task.title,
    client: task.client?.name ?? "Без клиента",
    clientId: task.client?.id ?? task.clientId ?? undefined,
    dealId: task.dealId ?? undefined,
    due: formatDateLabel(task.dueDate),
    dueDateIso: task.dueDate,
    status: task.status ?? "todo",
    priority: task.priority ?? "medium",
  };
}

export function clientDraftToPayload(draft: ClientDraft) {
  return {
    name: draft.name.trim(),
    industry: draft.industry.trim(),
    status: draft.status,
    tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  };
}

export function clientToUpdatePayload(client: Pick<CrmClient, "name" | "industry" | "status" | "tags" | "healthScore">) {
  return {
    name: client.name.trim(),
    industry: client.industry.trim(),
    status: client.status,
    tags: client.tags,
    healthScore: client.healthScore,
  };
}

export function dealDraftToPayload(draft: DealDraft) {
  return {
    title: draft.title.trim(),
    clientId: draft.clientId,
    stage: backendDealStageByUi[draft.stage],
    amount: draft.amount,
    closeDate: toIsoDate(draft.closeDate),
    probability: draft.probability,
  };
}

export function taskDraftToPayload(draft: TaskDraft) {
  return {
    title: draft.title.trim(),
    clientId: draft.clientId,
    priority: draft.priority,
    status: "todo" as TaskStatus,
    dueDate: toIsoDate(draft.due),
  };
}

export function moveDealStage(deals: CrmDeal[], dealId: string, stage: DealStage) {
  return deals.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal));
}

export function moveTaskStatus(tasks: CrmTask[], taskId: string, status: TaskStatus) {
  return tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
}

export function isActiveDeal(deal: Pick<CrmDeal, "stage">) {
  return !["Выиграна", "Проиграна"].includes(deal.stage);
}

export function calculateConversionRate(deals: Pick<CrmDeal, "stage">[]) {
  const closedDeals = deals.filter((deal) => ["Выиграна", "Проиграна"].includes(deal.stage));
  if (!closedDeals.length) return 0;
  const wonDeals = closedDeals.filter((deal) => deal.stage === "Выиграна");
  return Math.round((wonDeals.length / closedDeals.length) * 100);
}

export function isDueToday(task: Pick<CrmTask, "dueDateIso">, now = new Date()) {
  const dueDate = new Date(task.dueDateIso);
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate.toDateString() === now.toDateString();
}

export function buildRevenueSeries(deals: CrmDeal[]): RevenueSeriesPoint[] {
  const months = new Map<string, { month: string; sortKey: string; revenue: number; forecast: number }>();
  deals.forEach((deal) => {
    const date = new Date(deal.closeDateIso);
    const sortKey = Number.isNaN(date.getTime()) ? "9999-99" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = Number.isNaN(date.getTime()) ? "Без даты" : new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date);
    const current = months.get(sortKey) ?? { month, sortKey, revenue: 0, forecast: 0 };
    months.set(sortKey, {
      ...current,
      revenue: deal.stage === "Выиграна" ? current.revenue + deal.amount : current.revenue,
      forecast: isActiveDeal(deal) ? current.forecast + deal.amount * (deal.probability / 100) : current.forecast,
    });
  });
  const series = Array.from(months.values())
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
    .map(({ month, revenue, forecast }) => ({
      month,
      revenue: revenue > 0 ? revenue : null,
      forecast: forecast > 0 ? forecast : null,
    }));
  return series.length ? series : [{ month: "Нет данных", revenue: null, forecast: null }];
}

export function buildClient(draft: ClientDraft): CrmClient {
  const name = draft.name.trim();
  return {
    id: slugify(name),
    name,
    industry: draft.industry.trim(),
    status: draft.status,
    tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    manager: draft.manager.trim() || "Администратор Nexus",
    healthScore: 72,
    contacts: [],
    lastActivity: "Клиент добавлен вручную",
    notes: "Новый клиент. Добавьте контакты, сделки и следующую задачу.",
  };
}

export function buildTask(draft: TaskDraft): CrmTask {
  return {
    id: `task-${Date.now()}`,
    title: draft.title.trim(),
    client: draft.client?.trim() || "Без клиента",
    clientId: draft.clientId,
    due: draft.due.trim() || "Сегодня",
    dueDateIso: toIsoDate(draft.due),
    status: "todo",
    priority: draft.priority,
  };
}

export function toIsoDate(value: string) {
  const normalized = value.trim().toLowerCase();
  const date = new Date();
  if (normalized === "завтра") date.setDate(date.getDate() + 1);
  if (normalized && normalized !== "сегодня" && normalized !== "завтра") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return date.toISOString();
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "") || `client-${Date.now()}`;
}
