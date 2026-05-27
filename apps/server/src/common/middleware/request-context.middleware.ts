import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/http-headers';
import { createRequestId } from '../utils/request-id.util';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = this.resolveRequestId(request.headers[REQUEST_ID_HEADER]);

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }

  private resolveRequestId(value: string | string[] | undefined): string {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const requestId = rawValue?.trim();

    if (requestId && requestId.length <= 120 && /^[A-Za-z0-9._:-]+$/.test(requestId)) {
      return requestId;
    }

    return createRequestId();
  }
}
