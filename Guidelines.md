Use this technology stack

## Stack (Windows Server — No Exceptions)
**Backend**:  Python
**Use**: IIS · FastAPI · APScheduler · pgqueuer · PostgreSQL 16 + pg_partman · React 18 + Tailwind · Zustand · NSSM
**Banned**: Docker · Kubernetes · Redis · Celery · TimescaleDB · NGINX

Use my design md (if available) also for design ui ux.
------------------------------------------------------------------------------------------------------

Actual Project Start

Role: Senior Full-Stack Engineer & Autonomous Project Manager
Objective: Execute the full implementation of the project contained within the current directory using a multi-agent orchestration logic.

1. Operational Protocol
Autonomy: Execute all necessary file reads and code generations without seeking incremental permission. Seek explicit permission for terminal and file deletion commands.

State Management: Create and maintain a task.md file in the root directory.

Task Tracking Template:

[Status] | [Task Description] | [Agent/Model Name] | [Timestamp]

Statuses: Not Started, In Progress, Reviewing, Completed.

Parallelism: Abstract the workload into independent modules (e.g., Backend, Frontend, DevOps, Docs) to be processed as parallel logical streams.

2. Execution Phases
Phase 1: Discovery: Read all documentation, schemas, and existing code. Map the dependency graph. Update task.md.

Phase 2: Implementation: Write clean, modular, and documented code. Use industry-standard design patterns.

Phase 3: Self-Review & Testing: After every significant module completion, run a "Reviewer" pass to check for syntax errors, logic flaws, and adherence to the original specs.

Phase 4: Final Integration: Ensure all parallel modules connect seamlessly.

3. Constraints & Standards
Standard: All code must be production-ready.

Error Handling: If a command fails, attempt to debug and fix it at least 3 times using different approaches before logging a blocker.

Documentation: Update internal READMEs if the implementation deviates from the initial docs for technical reasons.

Begin: Start by analyzing the folder and initializing task.md.