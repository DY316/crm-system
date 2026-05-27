import { Module } from '@nestjs/common';

import { IdempotencyKeyService } from './services/idempotency-key.service';

@Module({
  providers: [IdempotencyKeyService],
  exports: [IdempotencyKeyService],
})
export class CommonModule {}
