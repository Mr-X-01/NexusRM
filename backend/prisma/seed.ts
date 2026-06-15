import { PrismaClient, Role, UserStatus, ClientStatus, DealStage, RiskLevel, TaskPriority, TaskStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);
  const managerPassword = await bcrypt.hash("manager123", 12);
  const viewerPassword = await bcrypt.hash("viewer123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@nexusrm.ai" },
    update: { name: "Алексей Орлов", role: Role.admin, status: UserStatus.active, title: "Владелец CRM", department: "Администрирование", phone: "+7 900 100-10-10" },
    create: { email: "admin@nexusrm.ai", name: "Алексей Орлов", role: Role.admin, status: UserStatus.active, title: "Владелец CRM", department: "Администрирование", phone: "+7 900 100-10-10", passwordHash: adminPassword },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@nexusrm.ai" },
    update: { name: "Мария Чен", role: Role.manager, status: UserStatus.active, title: "Руководитель продаж", department: "B2B продажи", phone: "+7 900 200-20-20" },
    create: { email: "manager@nexusrm.ai", name: "Мария Чен", role: Role.manager, status: UserStatus.active, title: "Руководитель продаж", department: "B2B продажи", phone: "+7 900 200-20-20", passwordHash: managerPassword },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@nexusrm.ai" },
    update: { name: "Илья Соколов", role: Role.viewer, status: UserStatus.active, title: "Финансовый аналитик", department: "Отчетность", phone: "+7 900 300-30-30" },
    create: { email: "viewer@nexusrm.ai", name: "Илья Соколов", role: Role.viewer, status: UserStatus.active, title: "Финансовый аналитик", department: "Отчетность", phone: "+7 900 300-30-30", passwordHash: viewerPassword },
  });

  await prisma.auditLog.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.aiInsight.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();

  const clients = [
    { name: "VectorCloud", industry: "B2B SaaS", status: ClientStatus.active, tags: ["enterprise", "cloud"], healthScore: 88 },
    { name: "RedForge Studio", industry: "Digital-агентство", status: ClientStatus.at_risk, tags: ["agency", "retainer"], healthScore: 42 },
    { name: "Northstar Outsourcing", industry: "IT outsourcing", status: ClientStatus.new, tags: ["nearshore", "pipeline"], healthScore: 71 },
  ];

  for (const item of clients) {
    const client = await prisma.client.upsert({
      where: { id: item.name.toLowerCase().replace(/\W/g, "-") },
      update: item,
      create: { id: item.name.toLowerCase().replace(/\W/g, "-"), ...item, managerId: manager.id },
    });

    await prisma.contact.createMany({
      data: [
        { clientId: client.id, name: "Алекс Морган", title: "COO", email: `alex@${client.name.toLowerCase().replace(/\W/g, "")}.com`, isPrimary: true },
        { clientId: client.id, name: "Рина Патель", title: "Head of Delivery", email: `rina@${client.name.toLowerCase().replace(/\W/g, "")}.com` },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.deal.createMany({
    data: [
      { title: "Программа cloud-миграции", clientId: "vectorcloud", stage: DealStage.Negotiation, amount: 42000, closeDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18), probability: 72, aiScore: 81, riskLevel: RiskLevel.low },
      { title: "Расширение ретейнера", clientId: "redforge-studio", stage: DealStage.Proposal, amount: 18500, closeDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9), probability: 48, aiScore: 55, riskLevel: RiskLevel.high },
      { title: "Выделенная delivery-команда", clientId: "northstar-outsourcing", stage: DealStage.Contacted, amount: 64000, closeDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31), probability: 37, aiScore: 49, riskLevel: RiskLevel.medium },
    ],
    skipDuplicates: true,
  });

  await prisma.task.createMany({
    data: [
      { title: "Отправить письмо в RedForge", priority: TaskPriority.urgent, status: TaskStatus.todo, dueDate: new Date(), assigneeId: manager.id, clientId: "redforge-studio" },
      { title: "Подготовить техническое предложение", priority: TaskPriority.high, status: TaskStatus.in_progress, dueDate: new Date(Date.now() + 86400000), assigneeId: manager.id, clientId: "vectorcloud" },
      { title: "Уточнить procurement-процесс", priority: TaskPriority.medium, status: TaskStatus.todo, dueDate: new Date(Date.now() + 172800000), assigneeId: manager.id, clientId: "northstar-outsourcing" },
    ],
    skipDuplicates: true,
  });

  await prisma.activity.createMany({
    data: [
      { type: "call", summary: "Discovery-звонок с Northstar завершен.", clientId: "northstar-outsourcing", userId: manager.id },
      { type: "risk", summary: "У RedForge нет активности 14 дней.", clientId: "redforge-studio", userId: manager.id },
      { type: "proposal", summary: "VectorCloud запросил procurement timeline.", clientId: "vectorcloud", userId: manager.id },
      { type: "report", summary: "Илья добавил финансовую сводку по прогнозу.", clientId: "vectorcloud", userId: viewer.id },
    ],
  });

  const demoApiKey = "nxrm_demo_public_key";
  await prisma.apiKey.upsert({
    where: { keyHash: createHash("sha256").update(demoApiKey).digest("hex") },
    update: {},
    create: {
      name: "Демо-ключ публичной интеграции",
      keyHash: createHash("sha256").update(demoApiKey).digest("hex"),
      prefix: "nxrm_demo",
      ownerId: admin.id,
    },
  });

  await prisma.auditLog.create({ data: { actorId: admin.id, action: "seed.demo_data", entity: "system" } });
  await prisma.workspaceSetting.upsert({
    where: { key: "workspace" },
    update: {
      value: {
        workspaceName: "NexusRM",
        timezone: "Europe/Moscow",
        currency: "USD",
        aiEnabled: true,
        publicApiEnabled: true,
        registrationEnabled: false,
        defaultRole: Role.manager,
      },
    },
    create: {
      key: "workspace",
      value: {
        workspaceName: "NexusRM",
        timezone: "Europe/Moscow",
        currency: "USD",
        aiEnabled: true,
        publicApiEnabled: true,
        registrationEnabled: false,
        defaultRole: Role.manager,
      },
    },
  });
}

main().finally(async () => prisma.$disconnect());
