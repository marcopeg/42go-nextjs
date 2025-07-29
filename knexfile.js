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

  // Parse search params into options
  const options = {};
  let ssl = false;
  url.searchParams.forEach((value, key) => {
    options[key] = value;
    if (key === "sslmode" && value === "require") {
      ssl = { rejectUnauthorized: true };
    }
    if (key === "channel_binding" && value === "require") {
      // pg supports channel_binding, but Knex doesn't need to set anything special
    }
  });

  return {
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
