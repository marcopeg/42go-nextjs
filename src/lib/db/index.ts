import knex, { Knex } from "knex";
import { createKnexConfig } from "./utils";

let db: Knex | null = null;

export const getDB = () => {
  if (db) {
    return db;
  }

  if (!process.env.PGSTRING) {
    throw new Error("PGSTRING environment variable is not set");
  }

  const knexConfig = createKnexConfig(process.env.PGSTRING);

  db = knex(knexConfig);

  return db;
};
