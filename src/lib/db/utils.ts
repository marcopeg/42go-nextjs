import { Knex } from "knex";
import fs from "fs";
import path from "path";

// Add this to your `knexfile.js`:
//
// const { parseConnectionString } = require('./src/lib/db/utils');
//
// module.exports = {
//   development: {
//     ...parseConnectionString(process.env.DBSTRING),
//   },
// };

type AnyObject = Record<string, unknown>;

const isObject = (item: unknown): item is AnyObject => {
  return !!item && typeof item === "object" && !Array.isArray(item);
};

const mergeDeep = (target: AnyObject, ...sources: AnyObject[]): AnyObject => {
  if (!sources.length) {
    return target;
  }
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key] || !isObject(target[key])) {
          target[key] = {};
        }
        target[key] = mergeDeep(
          target[key] as AnyObject,
          source[key] as AnyObject
        );
      } else {
        target[key] = source[key];
      }
    }
  }

  return mergeDeep(target, ...sources);
};

export const parseConnectionString = (
  connString: string | undefined
): Knex.Config => {
  if (!connString) {
    throw new Error("DBSTRING environment variable is not set");
  }

  const url = new URL(connString);
  const client = url.protocol.slice(0, -1);

  let baseConfig: Knex.Config;

  switch (client) {
    case "postgres":
    case "postgresql":
      baseConfig = {
        client: "pg",
        connection: {
          host: url.hostname,
          port: Number(url.port),
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
        },
      };
      break;

    case "mariadb":
    case "mysql":
      baseConfig = {
        client: "mysql2",
        connection: {
          host: url.hostname,
          port: Number(url.port),
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
        },
      };
      break;

    case "sqlserver":
      baseConfig = {
        client: "mssql",
        connection: {
          server: url.hostname,
          port: Number(url.port),
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          options: {
            encrypt: process.env.NODE_ENV === "production",
          },
        },
      };
      break;

    case "sqlite":
      baseConfig = {
        client: "sqlite3",
        connection: {
          filename: url.pathname,
        },
        useNullAsDefault: true,
      };
      break;

    default:
      throw new Error(`Unsupported database client: ${client}`);
  }

  // Layer 2: Environment Variables for Pool
  const pool: Knex.PoolConfig = {};
  if (process.env.DB_POOL_MIN) {
    pool.min = parseInt(process.env.DB_POOL_MIN, 10);
  }
  if (process.env.DB_POOL_MAX) {
    pool.max = parseInt(process.env.DB_POOL_MAX, 10);
  }
  if (process.env.DB_POOL_IDLE_TIMEOUT) {
    pool.idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10);
  }

  let config = baseConfig;
  if (Object.keys(pool).length > 0) {
    config.pool = pool;
  }

  // Layer 3: JSON Configuration File
  const jsonConfigPath = path.resolve(process.cwd(), "knex.config.json");
  if (fs.existsSync(jsonConfigPath)) {
    try {
      const jsonConfigString = fs.readFileSync(jsonConfigPath, "utf-8");
      const jsonConfig = JSON.parse(jsonConfigString);
      config = mergeDeep(
        config as AnyObject,
        jsonConfig as AnyObject
      ) as Knex.Config;
    } catch (error) {
      // A true warrior doesn't let a config error stop him, but he acknowledges it.
      console.warn("Could not read or parse knex.config.json:", error);
    }
  }

  return config;
};
