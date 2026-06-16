import { describe, expect, it } from "vitest";
import { buildRevenueSeries, calculateConversionRate, isActiveDeal, isDueToday, type CrmDeal } from "./crm";

const deals: CrmDeal[] = [
  { id: "d1", title: "June lead", client: "Northstar", clientId: "c1", stage: "Лид", amount: 64000, closeDate: "16 июня", closeDateIso: "2026-06-16T00:00:00.000Z", probability: 49, aiScore: 44, risk: "medium" },
  { id: "d2", title: "July won", client: "VectorCloud", clientId: "c2", stage: "Выиграна", amount: 42000, closeDate: "16 июля", closeDateIso: "2026-07-16T00:00:00.000Z", probability: 100, aiScore: 95, risk: "low" },
  { id: "d3", title: "August lost", client: "RedForge", clientId: "c3", stage: "Проиграна", amount: 18500, closeDate: "16 августа", closeDateIso: "2026-08-16T00:00:00.000Z", probability: 0, aiScore: 12, risk: "high" },
];

describe("crm dashboard calculations", () => {
  it("treats only open deals as active pipeline", () => {
    expect(deals.filter(isActiveDeal).map((deal) => deal.id)).toEqual(["d1"]);
  });

  it("calculates conversion from won deals among closed deals", () => {
    expect(calculateConversionRate(deals)).toBe(50);
    expect(calculateConversionRate([deals[0]])).toBe(0);
  });

  it("sorts revenue series by close date and keeps pipeline totals alongside expected forecast", () => {
    expect(buildRevenueSeries(deals)).toEqual([
      { month: "июнь", revenue: 64000, forecast: 31360 },
      { month: "июль", revenue: 42000, forecast: 42000 },
      { month: "авг.", revenue: null, forecast: null },
    ]);
  });

  it("checks today's tasks by ISO date instead of formatted labels", () => {
    expect(isDueToday({ dueDateIso: "2026-06-16T12:00:00.000Z" }, new Date("2026-06-16T08:00:00.000Z"))).toBe(true);
    expect(isDueToday({ dueDateIso: "2026-06-17T12:00:00.000Z" }, new Date("2026-06-16T08:00:00.000Z"))).toBe(false);
  });
});
