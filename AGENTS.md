# Kode repository guide

This file is the stable, always-on contract for contributors and coding agents.
Keep durable repository rules here; implementation details belong beside the
code they describe or in maintained documents under `docs/**`.

## Product direction

- Keep Kode terminal-native, fast, and predictable.
- Prefer intent-driven workflows with verifiable outcomes over setup menus.
- `.kode/**` is the canonical write surface; `.claude/**` is read/import
  compatibility only.
- Keep compatibility aliases in `packages/core/src/compat/**`.

## Repository map

- `apps/cli/`: CLI entrypoints, commands, and Ink TUI.
- `apps/server/`: local daemon and Web UI host.
- `apps/web/`: React/Vite Web UI source.
- `packages/core/`: orchestration, permissions, model wiring, and sessions.
- `packages/tools/`: built-in tool definitions and implementations.
- `packages/runtime/`: shell/runtime primitives and background tasks.
- `packages/config/`: configuration, schemas, and data roots.
- `packages/protocol/`: session and transport protocols.
- `packages/client/`: daemon client helpers.
- `packages/builtin-skills/`: skills shipped in the npm package.

## Required workflow

```bash
bun install --frozen-lockfile
bun run format:check
bun run architecture:check
bun run security:audit
bun run typecheck
bun test
bun run build
```

Run the smallest relevant check while iterating; run the full sequence before a
release. Do not commit generated output (`dist/**`, wrappers, Web UI builds,
platform binaries, coverage, or `node_modules/**`).

## Architecture rules

1. UI belongs in `apps/cli/src/ui/**` or `apps/web/**`.
2. Orchestration belongs in `packages/core/**`.
3. Tool behavior belongs in `packages/tools/**` and must remain permission-aware.
4. OS/process behavior belongs in `packages/runtime/**`.
5. Protocol and persisted formats must not depend on a UI host.

Do not add a new seam for a hypothetical implementation. When a seam is real,
keep transport and host adapters outside the owning domain module.

## Change rules

- Keep refactors, behavior changes, formatting, and generated artifacts separate.
- Add regression tests when changing persistence, permissions, protocols, or
  compatibility behavior.
- Tool descriptions may be async; callers must await function-valued descriptions.
- Subagents inherit the parent permission context and command constraints.
- Runtime-required knowledge belongs in `packages/builtin-skills/skills/**`, not
  developer documentation.

## Adding functionality

For a tool:

1. Add it under `packages/tools/src/tools/<domain>/<ToolName>/`.
2. Define its schema, prompt, permission behavior, and implementation.
3. Register it in `packages/tools/src/registry.ts`.
4. Add focused tests through its public behavior.

For a CLI command:

1. Add it under `apps/cli/src/commands/**`.
2. Register it in `apps/cli/src/commands/registry.ts`.
3. Verify help text, non-interactive behavior, and permission handling.

## Publishing

Publishing is CI-only. Merge a reviewed version bump, then push an annotated
`v<package.json version>` tag. Stable versions publish under `latest`;
prerelease versions publish under `dev`. See
[docs/develop/releasing.md](docs/develop/releasing.md). Never publish from a
developer workstation.

```markdown
## Greeting

- **Entry:** `nihao`
- **Meaning:** Chinese pinyin for “hello” (你好)
- **Usage:** General greeting or placeholder note.
```

_Added on 9/30/2026, 10:40:51 PM GMT+8_

## Greeting Note

- **nihao** (你好) — Hello / hi
- **Language:** Mandarin Chinese (pinyin)
- **Use:** General greeting

_Added on 9/30/2026, 10:40:54 PM GMT+8_