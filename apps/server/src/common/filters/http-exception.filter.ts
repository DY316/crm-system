import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/http-headers';
import { AppException, ErrorDetails } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { createRequestId } from '../utils/request-id.util';

type HttpExceptionResponse = {
  code?: string;
  message?: string | string[];
  error?: string;
  details?: ErrorDetails;
  statusCode?: number;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = this.resolveRequestId(request, response);
    const normalized = this.normalizeException(exception);

    if (normalized.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(normalized.message, stack, requestId);
    }

    const payload: ApiErrorResponse = {
      success: false,
      data: null,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      request_id: requestId,
    };

    response.status(normalized.statusCode).json(payload);
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details: ErrorDetails;
  } {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as HttpExceptionResponse;
        return {
          statusCode,
          code: body.code ?? this.mapStatusToCode(statusCode),
          message: this.formatMessage(body.message ?? body.error ?? exception.message),
          details: body.details ?? this.formatDetails(body.message),
        };
      }

      return {
        statusCode,
        code: this.mapStatusToCode(statusCode),
        message: this.formatMessage(exceptionResponse),
        details: {},
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: '服务内部错误',
      details: {},
    };
  }

  private resolveRequestId(request: Request, response: Response): string {
    const existingRequestId = request.requestId ?? response.getHeader(REQUEST_ID_HEADER);
    const requestId = typeof existingRequestId === 'string' ? existingRequestId : createRequestId();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    return requestId;
  }

  private formatMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join('; ');
    }

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    return '请求处理失败';
  }

  private formatDetails(message: unknown): ErrorDetails {
    if (Array.isArray(message)) {
      return { messages: message };
    }

    return {};
  }

  private mapStatusToCode(statusCode: number): ErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.METHOD_NOT_ALLOWED:
        return ErrorCode.METHOD_NOT_ALLOWED;
      default:
        return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? ErrorCode.INTERNAL_SERVER_ERROR
          : ErrorCode.BAD_REQUEST;
    }
  }
}
