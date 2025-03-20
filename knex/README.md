# Knex Migrations

This directory contains database migrations managed by [Knex.js](https://knexjs.org/).

## Available Commands

### Run Migrations

To run all pending migrations:

```bash
npm run knex:migrate
```

### Create a New Migration

To create a new migration file:

```bash
npm run knex:migrate:make <migration_name>
```

### Rollback Migrations

To rollback the most recent batch of migrations:

```bash
npm run knex:migrate:rollback
```

### Run Migrations Programmatically

To run migrations programmatically in your application:

```bash
npm run knex:run
```

## Migration Structure

Migrations are organized in sequential order using the CommonJS format. Each migration file contains:

1. An `up` function that implements the migration.
2. A `down` function that reverts the migration.

Example migration file:

```javascript
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('table_name', table => {
    table.increments('id');
    table.string('name');
    // ... add more columns
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('table_name');
};
```

## Configuration

Knex configuration is defined in the root `knexfile.js` file, which supports multiple environments:

- `development`
- `test`
- `production`

Each environment can have its own connection parameters, migration directories, and other settings.
