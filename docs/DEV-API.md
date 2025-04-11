# Development APIs

Development APIs contain utilities that can facilitate the developer's operations while actively working on the solution.

## Available APIs

- [Create New User](./DEV-API-CREATE-USER.md)

## Define Dev APIs

Add new _development apis_ to:

```bash
/src/app/api/dev
```

Those a simple routers and don't need any particular protection.

## Security Considerations

This API is intended for development and testing only. It is automatically disabled in production environments. You can also manually disable it by setting the `DISABLE_DEV_API=true` environment variable.

👉 This is enforce in `/src/middleware.ts`

## Environment Variables

| Variable          | Description                                  | Default |
| ----------------- | -------------------------------------------- | ------- |
| `DISABLE_DEV_API` | Set to `true` to disable the development API | `false` |
