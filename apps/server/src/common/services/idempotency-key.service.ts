import { Injectable } from '@nestjs/common';

@Injectable()
export class IdempotencyKeyService {
  normalize(value: string | string[] | undefined): string | undefined {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const normalized = rawValue?.trim();

    if (!normalized || normalized.length > 255) {
      return undefined;
    }

    return normalized;
  }
}
