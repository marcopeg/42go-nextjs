// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "./.env" });
const fs = require("fs");
const path = require("path");

const isObject = (item) => {
  return item && typeof item === "object" && !Array.isArray(item);
};

const mergeDeep = (target, ...sources) => {
  if (!sources.length) {
    return target;
  }
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
};

const parseConnectionString = (connString) => {
  if (!connString) {
    throw new Error("DBSTRING environment variable is not set");
  }

  const url = new URL(connString);
  const client = url.protocol.slice(0, -1);

  let baseConfig;

  switch (client) {
    case "postgres":
    case "postgresql":
      baseConfig = {
        client: "pg",
        connection: {
          host: url.hostname,
          port: Number(url.port) || 5432,
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
          port: Number(url.port) || 3306,
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
          port: Number(url.port) || 1433,
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
  const pool = {};
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
      config = mergeDeep(config, jsonConfig);
    } catch (error) {
      console.warn("Could not read or parse knex.config.json:", error);
    }
  }

  return config;
};

const connectionConfig = parseConnectionString(process.env.DBSTRING || "");

/**
 * Knex configuration file - PostgreSQL Only
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    ...connectionConfig,
    migrations: {
      directory: "./knex/migrations",
    },
    seeds: {
      directory: "./knex/seeds",
    },
  },

  test: {
    ...connectionConfig,
    migrations: {
      directory: "./knex/migrations",
    },
    seeds: {
      directory: "./knex/seeds",
    },
  },

  production: {
    ...connectionConfig,
    migrations: {
      directory: "./knex/migrations",
    },
    seeds: {
      directory: "./knex/seeds",
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
