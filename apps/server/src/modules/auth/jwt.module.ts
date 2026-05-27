import { Module } from '@nestjs/common';

import { AuthSessionService } from './services/auth-session.service';
import { JwtTokenService } from './services/jwt-token.service';

@Module({
  providers: [AuthSessionService, JwtTokenService],
  exports: [AuthSessionService, JwtTokenService],
})
export class JwtModule {}
