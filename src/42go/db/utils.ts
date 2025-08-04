import { Knex } from "knex";
import fs from "fs";
import path from "path";

// Add this to your `knexfile.js`:
//
// const { createKnexConfig } = require('./src/lib/db/utils');
//
// module.exports = {
//   development: {
//     ...createKnexConfig(process.env.PGSTRING),
//   },
// };

export const createKnexConfig = (
  connString: string | undefined
): Knex.Config => {
  if (!connString) {
    throw new Error("PGSTRING environment variable is not set");
  }

  const url = new URL(connString);
  const client = url.protocol.slice(0, -1);

  // Only PostgreSQL is supported
  if (client !== "postgres" && client !== "postgresql") {
    throw new Error(
      `Only PostgreSQL is supported. Use postgres:// or postgresql:// connection strings.`
    );
  }

  // Parse search params into options and handle SSL
  const options: Record<string, string> = {};
  let ssl: false | { rejectUnauthorized: true } = false;
  url.searchParams.forEach((value, key) => {
    options[key] = value;
    if (key === "sslmode" && value === "require") {
      ssl = { rejectUnauthorized: true };
    }
    if (key === "channel_binding" && value === "require") {
      // pg supports channel_binding, but Knex doesn't need to set anything special
    }
  });

  let baseConfig: Knex.Config = {
    client: "pg",
    connection: {
      host: url.hostname,
      port: Number(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ...options,
      ...(ssl ? { ssl } : {}),
    },
  };

  // Layer 2: Environment Variables for Pool (PGPOOL format: "min,max,idleTimeoutMillis")
  const pgPool = process.env.PGPOOL;
  if (pgPool) {
    const poolParams = pgPool.split(",").map((p) => p.trim());
    if (poolParams.length >= 2) {
      const pool: Knex.PoolConfig = {
        min: parseInt(poolParams[0], 10),
        max: parseInt(poolParams[1], 10),
      };
      if (poolParams[2]) {
        pool.idleTimeoutMillis = parseInt(poolParams[2], 10);
      }
      baseConfig.pool = pool;
    }
  }

  // Layer 3: JSON Configuration File (simple merge for most Knex config cases)
  const jsonConfigPath = path.resolve(process.cwd(), "knex.config.json");
  if (fs.existsSync(jsonConfigPath)) {
    try {
      const jsonConfigString = fs.readFileSync(jsonConfigPath, "utf-8");
      const jsonConfig = JSON.parse(jsonConfigString);

      // Simple merge - works well for most Knex configuration scenarios
      // For nested objects like pool, we merge them specifically
      baseConfig = {
        ...baseConfig,
        ...jsonConfig,
        // Handle pool config specially since it's the most commonly overridden nested object
        ...(jsonConfig.pool && baseConfig.pool
          ? { pool: { ...baseConfig.pool, ...jsonConfig.pool } }
          : {}),
      };
    } catch (error) {
      // A true warrior doesn't let a config error stop him, but he acknowledges it.
      console.warn("Could not read or parse knex.config.json:", error);
    }
  }

  return baseConfig;
};
