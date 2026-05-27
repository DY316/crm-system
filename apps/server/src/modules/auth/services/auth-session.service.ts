import { Injectable } from '@nestjs/common';

type SessionRecord = {
  userId: string;
  expiresAtMs: number;
};

@Injectable()
export class AuthSessionService {
  private readonly sessions = new Map<string, SessionRecord>();

  create(tokenId: string, userId: string, expiresAt: Date): void {
    this.pruneExpired();
    this.sessions.set(tokenId, {
      userId,
      expiresAtMs: expiresAt.getTime(),
    });
  }

  validate(tokenId: string, userId: string): boolean {
    const session = this.sessions.get(tokenId);

    if (!session || session.userId !== userId) {
      return false;
    }

    if (session.expiresAtMs <= Date.now()) {
      this.sessions.delete(tokenId);
      return false;
    }

    return true;
  }

  revoke(tokenId: string): void {
    this.sessions.delete(tokenId);
  }

  private pruneExpired(): void {
    const now = Date.now();

    for (const [tokenId, session] of this.sessions.entries()) {
      if (session.expiresAtMs <= now) {
        this.sessions.delete(tokenId);
      }
    }
  }
}
