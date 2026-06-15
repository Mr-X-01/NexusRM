import { describe, expect, it } from "vitest";
import { buildClient } from "./clients";

describe("client helpers", () => {
  it("creates a client with trimmed fields and sensible CRM defaults", () => {
    expect(
      buildClient({
        name: "  Acme Systems  ",
        industry: "  B2B SaaS ",
        tags: " enterprise,  platform ",
        manager: "",
        status: "new",
      }),
    ).toMatchObject({
      id: "acme-systems",
      name: "Acme Systems",
      industry: "B2B SaaS",
      tags: ["enterprise", "platform"],
      manager: "Администратор Nexus",
      status: "new",
      healthScore: 72,
      contacts: [],
    });
  });
});
