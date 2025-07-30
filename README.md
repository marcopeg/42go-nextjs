# 42Go.dev - NextJS Multi

This is a [Next.js](https://nextjs.org) boilerplate that lets you **create and execute multiple independent Apps** from a single codebase.

## Quick Start

> ⚡️ You can run this project in **GitHub Codespaces** ⚡️

---

Here is the plan to a smooth quick start:

1. Node 18+ is available on your machine
2. You have the connection string to a running Postgres database
3. Apply the _App_'s schema via _Migrations_ & _Seeds_
4. Run the _Development Server_

> Optionally, you should try working on this codebase with VSCode + Copilot and enjoy _Vibe Coding_ or _Task Oriented AI-Assisted Coding_.

### 1. Setup NodeJS

Follow a tutorial for your architecture:

- [Setup Node on Windows](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows)
- [Setup Node on Linux/Mac](https://github.com/nvm-sh/nvm)

### 2. Prepare PostgreSQL

This part is divided in 2 steps:

1. Running a Postgres db
2. Apply the app's schema via migrations & seeds

#### Local Postgres with Docker

If you have [Docker](https://docker.com) you can start and initialize your local db with one single command:

```bash
# Make Interface
# (suggested approach, you get a fully ready db with migrations and seeds already applied)
make db

# Manual Command:
docker-compose up -d db
```

Your db will be available at:

```bash
postgres://postgres:postgres@localhost:5432/postgres
```

#### Get a Free PostgreSQL NeonDB

You can quickly [create a temporary Postgres database here](https://neon.new/):

```bash
npx neondb
```

The wizard will generate a new PostgreSQL instance in the cloud and add the connection string to the `.env` file.

> This is a temporary instance and all the data you put in it will be gone in 72h. Please visit [NeonDB](https://neon.com) to learn howo to claim a free durable instance, or see more options for production.

### 3. Apply Migrations & Seeds

Copy the connection string into `.env`:  
<small>_(Checkout `.env.examle` for inspiration and guidelines)_</small>

```bash
DATABASE_URL=xxx
```

Then, run the following commands:

```bash
# Make Interface
make db.init

# Manual Commands
yarn install
npx knex migrate:latest
npx knex seed:run
```

> This is an **isomorphic operation** and you can safely run it over and over

### 4. Start the Development Server

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Finally, open [http://localhost:3000](http://localhost:3000) with your browser to see the running App.

## App's Config

You can start editing the App's configuration by modifying `@/AppConfig.ts`.

## Learn More

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Relevant Tutorials

- [Setup Node on Windows](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows)
- [Setup Node on Linux/Mac](https://github.com/nvm-sh/nvm)
- [Setup Copilot on VSCode](https://code.visualstudio.com/docs/copilot/setup)
- [Setup Docker with Colima on Mac](https://marcopeg.com/ditching-docker-desktop/)
