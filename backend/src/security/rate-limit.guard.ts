import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly ttlMs = 60_000;
  private readonly limit = 120;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip ?? request.socket?.remoteAddress ?? "unknown";
    const key = `${ip}:${request.method}:${request.route?.path ?? request.url}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.ttlMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > this.limit) {
      throw new HttpException("Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
