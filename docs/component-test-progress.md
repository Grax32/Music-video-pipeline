# Component Test Progress Tracker

This tracker breaks the pipeline into discretely testable components, including sub-components, and records current smoke-check status so progress is demoable.

Legend:
- ✅ Checked (passing in latest smoke run)
- ⏳ Pending (not yet checked)

## Component tree

- Music Video Pipeline
  - API Layer (`InMemoryPipelineApi`)
    - ✅ `createProject` seeds transcript bootstrap job
    - ✅ `queuePlanning` queues planning and blocks duplicate active planning jobs
    - ✅ `queueStoryboard` blocks when no valid plan exists, succeeds when revision exists
    - ✅ `saveVideoPlan` validates schema and versions revisions
    - ✅ `saveArtifact` / `getArtifact` immutable artifact persistence
    - ✅ `getProjectStatus` / `getJobStatus` read model checks via smoke flow
  - Orchestrator Layer (`queueJob`)
    - ✅ provider-aware queued job creation with deterministic ID/timestamp hooks
  - Validation Layer (`video-plan-validator`)
    - ✅ valid fixture accepted
    - ✅ invalid fixture rejected with validation error
  - Storage Layer
    - In-memory adapters
      - ✅ project metadata storage path (project, job, plan revision, plan payload)
      - ✅ artifact immutability behavior (no overwrite)
    - Filesystem adapters
      - ✅ metadata persistence across fresh adapter instances
      - ✅ artifact persistence across fresh adapter instances
  - Domain Contracts
    - ✅ `project-types` compatibility exercised through API/orchestrator smoke flow
    - ✅ `video-plan` compatibility exercised via schema validation + save/load
  - Gaps for next demo cycle
    - ⏳ Negative path checks for missing project IDs across every endpoint
    - ⏳ Concurrency/locking semantics for filesystem store writes
    - ⏳ End-to-end lifecycle beyond storyboard (shot/timeline/export)
    - ⏳ PostgreSQL-backed adapter checks (not implemented yet)

## Latest run evidence

- Command: `npm run build && node scripts/component-smoke-check.mjs`
- Result: all currently enumerated smoke checks passed.

## Suggested demo narrative

1. Show this tree and explain each green node is backed by executable checks.
2. Run the smoke command live to demonstrate regression protection.
3. Walk through one pending branch (e.g., concurrency semantics) as the next milestone.
