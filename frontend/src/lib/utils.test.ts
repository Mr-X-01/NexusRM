import { describe, expect, it } from "vitest";
import { money } from "./utils";

describe("money", () => {
  it("formats CRM amounts in Russian rubles by default", () => {
    expect(money(42000)).toBe("42 000 ₽");
  });
});
