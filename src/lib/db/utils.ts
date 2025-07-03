import { Knex } from "knex";

// Add this to your `knexfile.js`:
//
// const { parseConnectionString } = require('./src/lib/db/utils');
//
// module.exports = {
//   development: {
//     ...parseConnectionString(process.env.DBSTRING),
//   },
// };

export const parseConnectionString = (connString: string): Knex.Config => {
  if (!connString) {
    throw new Error("DBSTRING environment variable is not set");
  }

  const url = new URL(connString);
  const client = url.protocol.slice(0, -1);

  switch (client) {
    case "postgres":
    case "postgresql":
      return {
        client: "pg",
        connection: {
          host: url.hostname,
          port: Number(url.port),
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
        },
      };

    case "mariadb":
    case "mysql":
      return {
        client: "mysql2",
        connection: {
          host: url.hostname,
          port: Number(url.port),
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
        },
      };

    case "sqlserver":
      return {
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

    case "sqlite":
      return {
        client: "sqlite3",
        connection: {
          filename: url.pathname,
        },
        useNullAsDefault: true,
      };

    default:
      throw new Error(`Unsupported database client: ${client}`);
  }
};
