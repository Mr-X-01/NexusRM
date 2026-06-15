export function getApiErrorMessage(data: unknown, fallback = "API временно недоступен") {
  if (typeof data !== "object" || data === null || !("message" in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string").join("; ") || fallback;
  return fallback;
}

export function isExpiredTokenMessage(message: string) {
  return /invalid or expired access token|missing access token|недействительный refresh token/i.test(message);
}
