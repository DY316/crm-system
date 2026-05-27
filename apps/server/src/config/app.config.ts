import { registerAs } from '@nestjs/config';

function toPort(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '3000', 10);
  return Number.isFinite(parsed) ? parsed : 3000;
}

function toOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.SERVER_HOST ?? '0.0.0.0',
  port: toPort(process.env.SERVER_PORT),
  corsOrigins: toOrigins(process.env.SERVER_CORS_ORIGINS),
}));
