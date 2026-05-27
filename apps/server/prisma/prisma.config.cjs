const { join } = require("node:path");
const process = require("node:process");

const seedPath = join(__dirname, "seed.mjs").replaceAll("\\", "/");

try {
  process.loadEnvFile(join(__dirname, "../../..", ".env"));
} catch {
  // .env is optional in CI when environment variables are provided directly.
}

module.exports = {
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
    seed: `node ${seedPath}`,
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://crm:crm_password@localhost:5432/crm?schema=public",
  },
};
