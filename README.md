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

## Architecture progress snapshot

- ✅ Architecture and workflow documents are in place.
- ✅ Core domain contracts for projects, revisions, artifacts, and jobs are defined.
- ✅ Orchestrator bootstrap can queue provider-aware pipeline jobs.
- ✅ In-memory API handlers now cover:
  - project creation (with bootstrap transcript job)
  - planning job queueing
  - storyboard job queueing
  - project/job status reads
- ✅ Runtime `VideoPlan` schema validation is available via AJV, with valid/invalid fixtures for quick checks.
- ⏳ Remaining priorities:
  - storage adapters for metadata and immutable artifacts

## Next recommended steps

1. Add storage adapters for project metadata and immutable artifacts.
2. Wire validated `VideoPlan` documents into plan generation/persistence flow.
