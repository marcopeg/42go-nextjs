# Add config.match.fn [adn]

This is another way that a configuration can be matched:

`config.match.fn = async (request): bool`

In this case, the AppConfig provide a full asynchronous logic to apply to the incoming _Request_, the output should be boolean.

- this logic should be able to use the database connection to make calls
- this logic should be able to access any othe configuration at call time
- this logic should be able to access the environment variables

**Example:**

```ts
const customMatchLogic = async (request, { db, config }) => {
  //... custom logic here
  // await db.query(...) // this is the standard knex connector
  return true;
};
```
