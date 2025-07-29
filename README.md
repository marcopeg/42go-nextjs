This is a [Next.js](https://nextjs.org) project.

## Requirements

- Node 18+
- Postgres Database

## Prepare PostgreSQL

### Local Postgres with Docker

If you have [Docker](https://docker.com) you can start and initialize your local db with one single command:

```bash
make db
```

### Get a Free NeonDB

You can quickly [create a temporary Postgres database here](https://neon.new/):

```bash
npx neondb
```

Copy the connection string into `.env`:

```bash
PGSTRING=xxx
```

Run the initialization script:

```bash
make db.init
```

## Start the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the App's configuration by modifying `@/AppConfig.ts`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
