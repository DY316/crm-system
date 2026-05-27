import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { IDEMPOTENCY_KEY_HEADER } from '../constants/http-headers';
import { IdempotencyKeyService } from '../services/idempotency-key.service';

@Injectable()
export class IdempotencyKeyMiddleware implements NestMiddleware {
  constructor(private readonly idempotencyKeyService: IdempotencyKeyService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    const idempotency = this.idempotencyKeyService.resolve(request.headers[IDEMPOTENCY_KEY_HEADER], {
      method: request.method,
      path: request.originalUrl,
    });

    if (idempotency.key) {
      request.idempotencyKey = idempotency.key;
    }

    next();
  }
}
