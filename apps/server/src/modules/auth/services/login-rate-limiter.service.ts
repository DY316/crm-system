import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type LoginAttemptBucket = {
  attempts: number;
  resetAtMs: number;
};

@Injectable()
export class LoginRateLimiterService {
  private readonly buckets = new Map<string, LoginAttemptBucket>();
  private readonly maxAttempts = this.resolvePositiveInteger('LOGIN_RATE_LIMIT_MAX', 5);
  private readonly windowMs =
    this.resolvePositiveInteger('LOGIN_RATE_LIMIT_WINDOW_SECONDS', 5 * 60) * 1000;

  assertAllowed(ipAddress: string, email: string): void {
    const key = this.toKey(ipAddress, email);
    const bucket = this.buckets.get(key);

    if (!bucket) {
      return;
    }

    if (bucket.resetAtMs <= Date.now()) {
      this.buckets.delete(key);
      return;
    }

    if (bucket.attempts >= this.maxAttempts) {
      throw new HttpException(
        {
          code: 'AUTH_LOGIN_RATE_LIMITED',
          message: 'Too many login attempts',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(ipAddress: string, email: string): void {
    const key = this.toKey(ipAddress, email);
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAtMs <= now) {
      this.buckets.set(key, {
        attempts: 1,
        resetAtMs: now + this.windowMs,
      });
      return;
    }

    bucket.attempts += 1;
  }

  recordSuccess(ipAddress: string, email: string): void {
    this.buckets.delete(this.toKey(ipAddress, email));
  }

  private toKey(ipAddress: string, email: string): string {
    return `${ipAddress.trim().toLowerCase()}::${email.trim().toLowerCase()}`;
  }

  private resolvePositiveInteger(name: string, fallback: number): number {
    const parsed = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
