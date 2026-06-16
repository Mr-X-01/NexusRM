import { describe, expect, it } from "vitest";
import { moveDealStage, type CrmDeal } from "./deals";

const deals: CrmDeal[] = [
  { id: "d1", title: "Deal 1", client: "VectorCloud", clientId: "c1", stage: "Лид", amount: 1000, closeDate: "Сегодня", closeDateIso: "2026-06-16T00:00:00.000Z", probability: 25, aiScore: 30, risk: "high" },
  { id: "d2", title: "Deal 2", client: "RedForge", clientId: "c2", stage: "Контакт", amount: 2000, closeDate: "Завтра", closeDateIso: "2026-06-17T00:00:00.000Z", probability: 55, aiScore: 60, risk: "medium" },
];

describe("moveDealStage", () => {
  it("moves only the selected deal to the target stage", () => {
    const updated = moveDealStage(deals, "d1", "Переговоры");

    expect(updated[0]).toMatchObject({ id: "d1", stage: "Переговоры" });
    expect(updated[1]).toMatchObject({ id: "d2", stage: "Контакт" });
  });
});
