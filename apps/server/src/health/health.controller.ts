import { Controller, Get, Query } from '@nestjs/common';

import { SystemPingQueryDto } from './dto/system-ping-query.dto';

@Controller('system')
export class HealthController {
  @Get('health')
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ping')
  ping(@Query() query: SystemPingQueryDto): { status: 'ok'; limit: number } {
    return {
      status: 'ok',
      limit: query.limit ?? 20,
    };
  }
}
