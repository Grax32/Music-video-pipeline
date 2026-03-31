# Installation & Local Development Setup

This document covers how to run the current repository locally, what versions are expected, and when you need extra services like PostgreSQL.

## 1) Current project status (important)

Right now, this codebase is a **TypeScript foundation** with in-memory and filesystem storage adapters.

- You can run compile/type checks with no external server.
- **PostgreSQL is not required yet** for current functionality.
- DaVinci Resolve is part of the architecture plan and future export flow, but there is no active Resolve integration code in this repository yet.

## 2) Expected versions

### Required for current code

- **Node.js 22.x LTS** (recommended: latest 22.x)
- **npm 10.x** (bundled with modern Node 22 installs)
- **TypeScript 5.8.x** (installed from project devDependencies)

Why these expectations:

- `@types/node` is pinned to the Node 22 generation.
- TypeScript is pinned at `^5.8.3` in `package.json`.
- The compiler config targets modern Node ESM (`module`/`moduleResolution`: `NodeNext`, `target`: `ES2022`).

### DaVinci Resolve expectation

For planned Resolve-export work, use:

- **DaVinci Resolve 19.x** (Free or Studio)

Notes:

- The architecture specifies Resolve-driven `.drp` export via scripting in a future milestone.
- Because scripting/export code is not yet implemented in this repository, no exact script-level API compatibility matrix is enforced yet.

## 3) Do you need PostgreSQL or any other servers?

### Today (current repository)

- **No database server required**.
- **No Redis/queue service required**.
- **No object storage service required**.

You can run checks/build directly with local filesystem + in-memory adapters.

### Near-future roadmap

PostgreSQL is planned for scaling/reliability:

- concurrent workers
- stronger consistency guarantees
- durable metadata beyond process memory

So Postgres is optional now, likely required later when DB-backed adapters are added.

## 4) Quick start (manual)

```bash
npm install
npm run check
npm run build
```

## 5) Init script (one-command setup)

Use this script to bootstrap the project and run validation/build:

```bash
./scripts/init-local.sh
```

What it does:

1. Verifies Node and npm are available.
2. Prints versions.
3. Runs `npm install`.
4. Runs `npm run check`.
5. Runs `npm run build`.

## 6) Docker Compose option

A development compose file is included:

```bash
docker compose up --build
```

This starts:

- `app`: Node 22 container that installs deps and runs `npm run check && npm run build`
- `postgres` (optional profile `db`): Postgres 16 for future adapter development

Start with Postgres too:

```bash
docker compose --profile db up --build
```

## 7) Common troubleshooting

### Node version mismatch

If builds fail unexpectedly, confirm:

```bash
node -v
npm -v
```

Use Node 22.x for best compatibility with current typing/toolchain.

### Docker permissions

If Docker commands fail, ensure Docker Engine/Desktop is running and your user has permission to run Docker commands.

### Resolve not found

That is expected for now unless you are validating future export automation work; no current command in this repo requires Resolve.
