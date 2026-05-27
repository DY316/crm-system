import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from './error-codes';

export type ErrorDetails = Record<string, unknown>;

export class AppException extends HttpException {
  constructor(
    private readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus,
    private readonly errorDetails: ErrorDetails = {},
  ) {
    super({ code: errorCode, message, details: errorDetails }, statusCode);
  }

  get code(): ErrorCode {
    return this.errorCode;
  }

  get details(): ErrorDetails {
    return this.errorDetails;
  }
}
