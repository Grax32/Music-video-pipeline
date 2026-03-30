# Music Video Pipeline

Local-first API and orchestration foundation for an AI-assisted music video workflow.

## Project bootstrap status

This repository includes a minimal TypeScript scaffold aligned with the architecture plan:

- architecture source docs in `architecture-plan.md` and `docs/architecture-plan.md`
- initial JSON schema in `schemas/video-plan.schema.json`
- domain contracts in `src/domain/project-types.ts`
- orchestrator bootstrap in `src/orchestrator/pipeline-orchestrator.ts`
- package entrypoint in `src/index.ts`

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
│   └── index.ts
├── architecture-plan.md
├── package.json
└── tsconfig.json
```

## Next recommended steps

1. Add API handlers for project creation, planning, storyboard generation, and job status.
2. Add schema validation runtime and fixtures for `VideoPlan`.
3. Add storage adapters for project metadata and immutable artifacts.
