import { randomUUID } from 'crypto';

export function createRequestId(): string {
  return `req_${randomUUID().replaceAll('-', '')}`;
}
