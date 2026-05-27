export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const host = String(config.SERVER_HOST ?? '0.0.0.0').trim();
  const rawPort = String(config.SERVER_PORT ?? '3000');
  const port = Number.parseInt(rawPort, 10);

  if (!host) {
    throw new Error('SERVER_HOST must not be empty');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SERVER_PORT must be an integer between 1 and 65535');
  }

  return config;
}
