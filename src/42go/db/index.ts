import "server-only";
import knex, { Knex } from "knex";
import { createKnexConfig } from "./utils";

let db: Knex | null = null;

export const getDB = () => {
  if (db) {
    return db;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const knexConfig = createKnexConfig(process.env.DATABASE_URL);

  db = knex(knexConfig);

  return db;
};
