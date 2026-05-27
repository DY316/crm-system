import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';

type ValidationFieldError = {
  field: string;
  messages: string[];
};

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) =>
      new AppException(ErrorCode.VALIDATION_ERROR, '请求参数校验失败', HttpStatus.BAD_REQUEST, {
        fields: flattenValidationErrors(errors),
      }),
  });
}

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): ValidationFieldError[] {
  return errors.flatMap((error) => {
    const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;
    const current = error.constraints
      ? [
          {
            field: fieldPath,
            messages: Object.values(error.constraints),
          },
        ]
      : [];

    return [...current, ...flattenValidationErrors(error.children ?? [], fieldPath)];
  });
}
