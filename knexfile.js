// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "./.env" });

const createKnexConfig = (connString) => {
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

  return {
    client: "pg",
    connection: {
      host: url.hostname,
      port: Number(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    },
  };
};

const connectionConfig = createKnexConfig(process.env.PGSTRING || "");

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
