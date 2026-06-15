import { describe, expect, it } from "vitest";
import { getApiErrorMessage, isExpiredTokenMessage } from "./api";

describe("api error helpers", () => {
  it("normalizes array and string API messages", () => {
    expect(getApiErrorMessage({ message: ["Invalid or expired access token"] })).toBe("Invalid or expired access token");
    expect(getApiErrorMessage({ message: "Insufficient role" })).toBe("Insufficient role");
  });

  it("detects expired token messages for session recovery", () => {
    expect(isExpiredTokenMessage("Invalid or expired access token")).toBe(true);
    expect(isExpiredTokenMessage("Missing access token")).toBe(true);
    expect(isExpiredTokenMessage("Insufficient role")).toBe(false);
  });
});
