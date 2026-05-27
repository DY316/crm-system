import { Injectable } from '@nestjs/common';
import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';

@Injectable()
export class PasswordHashService {
  verify(password: string, storedHash: string): boolean {
    const [algorithm, iterationsValue, salt, expectedHash] = storedHash.split('$');

    if (algorithm !== 'pbkdf2_sha256' || !iterationsValue || !salt || !expectedHash) {
      return false;
    }

    const iterations = Number.parseInt(iterationsValue, 10);

    if (!Number.isInteger(iterations) || iterations < 1) {
      return false;
    }

    const actualHash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');

    return this.safeEqual(actualHash, expectedHash);
  }

  private safeEqual(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }
}
