import { Controller, Get } from '@nestjs/common';

@Controller('system')
export class HealthController {
  @Get('health')
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
