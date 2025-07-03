import knex, { Knex } from "knex";
import { parseConnectionString } from "./utils";

let db: Knex | null = null;

export const getDB = () => {
  if (db) {
    return db;
  }

  if (!process.env.DBSTRING) {
    throw new Error("DBSTRING environment variable is not set");
  }

  const knexConfig = parseConnectionString(process.env.DBSTRING);

  db = knex(knexConfig);

  return db;
};
