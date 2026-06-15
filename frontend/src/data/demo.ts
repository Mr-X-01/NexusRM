export type ClientStatus = "new" | "active" | "at_risk" | "lost";
export type DealStage = "Лид" | "Контакт" | "Предложение" | "Переговоры" | "Выиграна" | "Проиграна";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const stages: DealStage[] = ["Лид", "Контакт", "Предложение", "Переговоры", "Выиграна", "Проиграна"];

export const clients = [
  {
    id: "vectorcloud",
    name: "VectorCloud",
    industry: "B2B SaaS",
    status: "active" as ClientStatus,
    tags: ["enterprise", "cloud"],
    manager: "Maya Chen",
    healthScore: 88,
    contacts: ["Alex Morgan", "Rina Patel"],
    lastActivity: "Разбор предложения 2 часа назад",
    notes: "Возможность расширения связана с дедлайном миграции.",
  },
  {
    id: "redforge",
    name: "RedForge Studio",
    industry: "Digital Agency",
    status: "at_risk" as ClientStatus,
    tags: ["agency", "retainer"],
    manager: "Maya Chen",
    healthScore: 42,
    contacts: ["Ilya Novak", "Sofia Grant"],
    lastActivity: "Нет активности 14 дней",
    notes: "Риск продления. Нужно письмо руководителю сегодня.",
  },
  {
    id: "northstar",
    name: "Northstar Outsourcing",
    industry: "IT Outsourcing",
    status: "new" as ClientStatus,
    tags: ["nearshore", "pipeline"],
    manager: "Администратор Nexus",
    healthScore: 71,
    contacts: ["Sam Rivera"],
    lastActivity: "Discovery-звонок вчера",
    notes: "Хорошо подходит под формат выделенной delivery-команды.",
  },
];

export const deals = [
  { id: "d1", title: "Программа cloud-миграции", client: "VectorCloud", stage: "Переговоры" as DealStage, amount: 42000, closeDate: "28 июня", probability: 72, aiScore: 81, risk: "low" },
  { id: "d2", title: "Расширение ретейнера", client: "RedForge Studio", stage: "Предложение" as DealStage, amount: 18500, closeDate: "22 июня", probability: 48, aiScore: 55, risk: "high" },
  { id: "d3", title: "Выделенная delivery-команда", client: "Northstar Outsourcing", stage: "Контакт" as DealStage, amount: 64000, closeDate: "14 июля", probability: 37, aiScore: 49, risk: "medium" },
  { id: "d4", title: "Спринт security-аудита", client: "VectorCloud", stage: "Выиграна" as DealStage, amount: 12000, closeDate: "8 июня", probability: 100, aiScore: 94, risk: "low" },
  { id: "d5", title: "Миграция legacy CRM", client: "RedForge Studio", stage: "Лид" as DealStage, amount: 28000, closeDate: "4 июля", probability: 24, aiScore: 36, risk: "high" },
];

export const tasks = [
  { id: "t1", title: "Отправить письмо в RedForge", client: "RedForge Studio", due: "Сегодня", status: "todo" as TaskStatus, priority: "urgent" as TaskPriority },
  { id: "t2", title: "Подготовить техническое предложение", client: "VectorCloud", due: "Завтра", status: "in_progress" as TaskStatus, priority: "high" as TaskPriority },
  { id: "t3", title: "Уточнить procurement-процесс", client: "Northstar Outsourcing", due: "20 июня", status: "todo" as TaskStatus, priority: "medium" as TaskPriority },
  { id: "t4", title: "Архивировать документы выигранного спринта", client: "VectorCloud", due: "18 июня", status: "done" as TaskStatus, priority: "low" as TaskPriority },
];

export const activities = [
  "AI отметил RedForge как риск: нет активности 14 дней.",
  "VectorCloud перешел в переговоры с вероятностью закрытия 72%.",
  "Northstar завершил discovery-звонок и запросил цену delivery-команды.",
  "Публичный API принял входящий лид от Acme Systems.",
];

export const revenueSeries = [
  { month: "Янв", revenue: 18000, forecast: 22000 },
  { month: "Фев", revenue: 24000, forecast: 26000 },
  { month: "Мар", revenue: 31000, forecast: 30000 },
  { month: "Апр", revenue: 28000, forecast: 35000 },
  { month: "Май", revenue: 37000, forecast: 39000 },
  { month: "Июн", revenue: 42000, forecast: 47000 },
];

export const conversionSeries = [
  { stage: "Лид", value: 44 },
  { stage: "Контакт", value: 31 },
  { stage: "Предложение", value: 19 },
  { stage: "Выиграна", value: 8 },
];
