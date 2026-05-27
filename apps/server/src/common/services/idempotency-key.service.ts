import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export interface IdempotencyScopeInput {
  key: string;
  method: string;
  path: string;
  actorId?: string | null;
  workspaceId?: string | null;
}

export interface IdempotencyKeyResolution {
  key?: string;
  isWriteMethod: boolean;
  storageKey?: string;
}

@Injectable()
export class IdempotencyKeyService {
  private readonly writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  normalize(value: string | string[] | undefined): string | undefined {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const normalized = rawValue?.trim();

    if (!normalized || normalized.length > 255 || !/^[A-Za-z0-9._:-]+$/.test(normalized)) {
      return undefined;
    }

    return normalized;
  }

  resolve(
    value: string | string[] | undefined,
    context: Omit<IdempotencyScopeInput, 'key'>,
  ): IdempotencyKeyResolution {
    const key = this.normalize(value);
    const isWriteMethod = this.isWriteMethod(context.method);

    return {
      key,
      isWriteMethod,
      storageKey: key
        ? this.buildStorageKey({
            ...context,
            key,
          })
        : undefined,
    };
  }

  isWriteMethod(method: string): boolean {
    return this.writeMethods.has(method.toUpperCase());
  }

  buildStorageKey(input: IdempotencyScopeInput): string {
    return [
      input.workspaceId ?? 'global',
      input.actorId ?? 'anonymous',
      input.method.toUpperCase(),
      input.path,
      input.key,
    ]
      .map((part) => encodeURIComponent(part))
      .join(':');
  }

  createFingerprint(payload: unknown): string {
    return createHash('sha256').update(this.stableSerialize(payload)).digest('hex');
  }

  private stableSerialize(value: unknown): string {
    if (value === undefined) {
      return 'undefined';
    }

    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value) ?? String(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(',')}]`;
    }

    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${this.stableSerialize(entryValue)}`)
      .join(',')}}`;
  }
}
