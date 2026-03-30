# Music Video Pipeline

Local-first API and orchestration foundation for an AI-assisted music video workflow.

## Project bootstrap status

This repository now includes a basic TypeScript project skeleton aligned with the architecture plan:

- `docs/architecture-plan.md` copied into a docs location
- initial JSON schema at `schemas/video-plan.schema.json`
- domain model definitions at `src/domain/project-types.ts`
- orchestrator bootstrap function at `src/orchestrator/pipeline-orchestrator.ts`
- baseline TypeScript toolchain (`package.json`, `tsconfig.json`)

## Quick start

```bash
npm install
npm run check
npm run build
```

## Current structure

```text
.
├── docs/
├── schemas/
├── src/
│   ├── api/
│   ├── domain/
│   ├── orchestrator/
│   ├── providers/
│   │   ├── cloud/
│   │   └── local/
│   ├── services/
│   │   ├── asr/
│   │   ├── planning/
│   │   ├── render/
│   │   ├── resolve/
│   │   ├── storyboard/
│   │   └── timeline/
│   └── storage/
└── projects/
```

## Next recommended steps

1. Add a persistence layer for `Project`, `Revision`, `Artifact`, and `PipelineJob` entities.
2. Add HTTP handlers for the initial endpoints from the architecture plan.
3. Add schema validation tooling and sample fixtures for plans and storyboards.
