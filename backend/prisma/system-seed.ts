import { PrismaClient, Role, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function ensureUser(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
  title: string;
  department: string;
  phone: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      status: UserStatus.active,
      title: input.title,
      department: input.department,
      phone: input.phone,
    },
    create: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      status: UserStatus.active,
      title: input.title,
      department: input.department,
      phone: input.phone,
    },
  });
}

async function main() {
  const admin = await ensureUser({
    email: "admin@nexusrm.ai",
    password: "admin123",
    name: "Алексей Орлов",
    role: Role.admin,
    title: "Владелец CRM",
    department: "Администрирование",
    phone: "+7 900 100-10-10",
  });

  await ensureUser({
    email: "manager@nexusrm.ai",
    password: "manager123",
    name: "Мария Чен",
    role: Role.manager,
    title: "Руководитель продаж",
    department: "B2B продажи",
    phone: "+7 900 200-20-20",
  });

  await ensureUser({
    email: "viewer@nexusrm.ai",
    password: "viewer123",
    name: "Илья Соколов",
    role: Role.viewer,
    title: "Финансовый аналитик",
    department: "Отчетность",
    phone: "+7 900 300-30-30",
  });

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

  const demoApiKey = "nxrm_demo_public_key";
  await prisma.apiKey.upsert({
    where: { keyHash: createHash("sha256").update(demoApiKey).digest("hex") },
    update: { isActive: true, ownerId: admin.id },
    create: {
      name: "Демо-ключ публичной интеграции",
      keyHash: createHash("sha256").update(demoApiKey).digest("hex"),
      prefix: "nxrm_demo",
      ownerId: admin.id,
    },
  });
}

main().finally(async () => prisma.$disconnect());
