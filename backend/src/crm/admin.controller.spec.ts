import { Role, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AdminController } from "./admin.controller";

describe("AdminController", () => {
  it("creates additional users without returning password hashes", async () => {
    const prisma = {
      user: {
        create: jest.fn(async ({ data, select }) => {
          const record = {
            id: "user-1",
            email: data.email,
            name: data.name,
            role: data.role,
            status: data.status,
            title: data.title,
            department: data.department,
            phone: data.phone,
            lastLoginAt: null,
            createdAt: new Date("2026-06-15T00:00:00.000Z"),
          };
          return select.passwordHash ? { ...record, passwordHash: data.passwordHash } : record;
        }),
      },
      auditLog: {
        create: jest.fn(async () => ({})),
      },
    };
    const controller = new AdminController(prisma as never);

    const result = await controller.createUser(
      {
        email: "new.manager@nexusrm.ai",
        name: "Новый менеджер",
        password: "manager123",
        role: Role.manager,
        status: UserStatus.active,
        title: "Менеджер продаж",
        department: "Продажи",
        phone: "+7 999 111-22-33",
      },
      { sub: "admin-1", email: "admin@nexusrm.ai", name: "Admin", role: Role.admin },
    );

    const createdData = prisma.user.create.mock.calls[0][0].data;
    expect(createdData.email).toBe("new.manager@nexusrm.ai");
    expect(await bcrypt.compare("manager123", createdData.passwordHash)).toBe(true);
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.role).toBe(Role.manager);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        action: "admin.user.create",
        entity: "user",
        entityId: "user-1",
      },
    });
  });
});
