import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type JwtClaims = {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  workspace_id: string;
  jti: string;
  iat: number;
  exp: number;
};

export type SignedAccessToken = {
  token: string;
  claims: JwtClaims;
  expiresIn: number;
  expiresAt: Date;
};

@Injectable()
export class JwtTokenService {
  private readonly issuer = 'crm-server';
  private readonly audience = 'crm-api';
  private readonly secret = this.resolveSecret();
  private readonly accessTokenTtlSeconds = this.resolveTtlSeconds();

  signAccessToken(input: {
    userId: string;
    email: string;
    workspaceId: string;
  }): SignedAccessToken {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAt + this.accessTokenTtlSeconds;
    const claims: JwtClaims = {
      iss: this.issuer,
      aud: this.audience,
      sub: input.userId,
      email: input.email,
      workspace_id: input.workspaceId,
      jti: randomUUID(),
      iat: issuedAt,
      exp: expiresAtSeconds,
    };
    const header = this.encodeJson({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encodeJson(claims);
    const signature = this.sign(`${header}.${payload}`);

    return {
      token: `${header}.${payload}.${signature}`,
      claims,
      expiresIn: this.accessTokenTtlSeconds,
      expiresAt: new Date(expiresAtSeconds * 1000),
    };
  }

  verifyAccessToken(token: string): JwtClaims {
    const [header, payload, signature, extra] = token.split('.');

    if (!header || !payload || !signature || extra !== undefined) {
      throw this.unauthorized('Invalid access token');
    }

    const expectedSignature = this.sign(`${header}.${payload}`);

    if (!this.safeEqual(signature, expectedSignature)) {
      throw this.unauthorized('Invalid access token');
    }

    const decodedHeader = this.decodeJson<{ alg?: string; typ?: string }>(header);

    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') {
      throw this.unauthorized('Invalid access token');
    }

    const claims = this.decodeJson<JwtClaims>(payload);

    if (!this.hasValidClaims(claims)) {
      throw this.unauthorized('Invalid access token');
    }

    if (claims.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Access token expired',
      });
    }

    return claims;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private encodeJson(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decodeJson<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw this.unauthorized('Invalid access token');
    }
  }

  private safeEqual(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private hasValidClaims(claims: JwtClaims): boolean {
    return (
      claims.iss === this.issuer &&
      claims.aud === this.audience &&
      typeof claims.sub === 'string' &&
      claims.sub.length > 0 &&
      typeof claims.email === 'string' &&
      claims.email.length > 0 &&
      typeof claims.workspace_id === 'string' &&
      claims.workspace_id.length > 0 &&
      typeof claims.jti === 'string' &&
      claims.jti.length > 0 &&
      Number.isInteger(claims.iat) &&
      Number.isInteger(claims.exp) &&
      claims.exp > claims.iat
    );
  }

  private resolveSecret(): string {
    const secret = process.env.JWT_SECRET?.trim();

    if (secret) {
      return secret;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException({
        code: 'AUTH_JWT_SECRET_MISSING',
        message: 'JWT_SECRET must be set in production',
      });
    }

    return 'crm-development-auth-secret-change-before-production';
  }

  private resolveTtlSeconds(): number {
    const parsed = Number.parseInt(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? '', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 60 * 60;
  }

  private unauthorized(message: string): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTH_UNAUTHORIZED',
      message,
    });
  }
}
