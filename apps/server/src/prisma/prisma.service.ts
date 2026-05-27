import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  onModuleInit(): void {
    this.logger.log('Prisma module initialized in shell mode');
  }

  onModuleDestroy(): void {
    this.logger.log('Prisma module destroyed');
  }
}
