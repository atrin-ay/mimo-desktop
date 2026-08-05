# ADR-003: SDK Memory Integration Findings

**Date:** 2026-07-24
**Status:** Investigation Complete
**Scope:** Four investigations into MiMoCode native memory vs. ProjectBrain overlap

---

## Investigation 1 — Is MiMoCode's native memory reachable via `mimo serve` HTTP API?

### Question

Can the `mimo serve` headless HTTP API read/write MiMoCode's MEMORY.md/checkpoint.md files, and does session creation accept a working directory parameter that would scope memory to a specific project?

### Evidence

**`mimo serve --help` output** (captured live):
```
Options:
  -h, --help         show help
  -v, --version      show version number
      --print-logs   print logs to stderr
      --log-level    log level [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure         run without external plugins
      --port         port to listen on [default: 0]
      --hostname     hostname to listen on [default: "127.0.0.1"]
      --mdns         enable mDNS service discovery
      --mdns-domain  custom domain name for mDNS service
      --cors         additional domains to allow for CORS
      --no-auth      allow starting without authentication on non-loopback addresses
```

No memory, dream, distill, checkpoint, or working-directory flags exist.

**HTTP API surface** (from `MimoServeProvider.ts` lines 440-951):
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/session` | POST | Create session (body: `{}`) |
| `/session` | GET | List sessions |
| `/session/{id}` | DELETE | Delete session |
| `/session/{id}/message` | POST | Send message (non-streaming) |
| `/session/{id}/prompt_async` | POST | Send message (streaming) |
| `/event` | GET | SSE event stream |
| `/question` | GET | List pending questions |
| `/question/{id}/reply` | POST | Reply to question |
| `/question/{id}/reject` | POST | Reject question |
| `/agent` | GET | List agents |
| `/health` | GET | Health check |

No `/memory`, `/dream`, `/distill`, `/checkpoint`, or `/memory-read` endpoints exist.

**Session creation** (line 836): `POST /session` with body `{}` — no working directory or project path parameter.

**`POST /session` does not accept a cwd/project parameter.** The session is created in whatever working directory `mimo serve` was started in (line 164-166 of MimoServeProvider.ts: `cwd: process.env.USERPROFILE || process.env.HOME || '.'`).

**Memory files on disk** (`~/.local/share/mimocode/memory/`):
```
global/MEMORY.md              — cross-project user preferences
projects/global/MEMORY.md     — project memory (singular, global, not per-project)
sessions/<id>/checkpoint.md   — per-session checkpoints
sessions/<id>/notes.md        — per-session notes
sessions/<id>/tasks/<id>/progress.md — per-task progress
```

Key observation: `projects/global/MEMORY.md` is a **single global file** for all projects, not per-project. There is no `projects/<projectId>/MEMORY.md` path.

**Baseline: CLI mode DOES create memory files.** The `~/.local/share/mimocode/memory/` directory contains dozens of session checkpoints and notes from prior interactive CLI sessions. These were created by `mimo run` or the TUI, not by `mimo serve`.

### Conclusion

**MiMoCode's native memory system is NOT reachable via the `mimo serve` HTTP API.** The serve API is a thin session-management and message-passing layer. Memory operations (checkpoint writing, dream/distill consolidation, MEMORY.md updates) run as background processes inside the MiMoCode runtime — they are triggered by session activity in the TUI/CLI but are not exposed as HTTP endpoints. The serve API does not accept a working directory parameter, so even if memory endpoints existed, there would be no way to scope them to a specific project via HTTP.

---

## Investigation 2 — Content overlap check

### Question

If MiMoCode's native memory is reachable (per Investigation 1), compare checkpoint.md/MEMORY.md content against ProjectBrain.state content for overlap.

### Evidence

Investigation 1 found that `mimo serve` does not expose memory endpoints. The memory files that exist on disk were created by prior interactive CLI sessions, not by the app's `MimoServeProvider`.

### Conclusion

**N/A.** The native memory system is not reachable via the serve API, so there is no programmatic way to compare content through the integration layer. The two systems operate in completely separate domains:

- **ProjectBrain** (app): SQLite `project_brain` table, structured JSON with `BrainState` + `BrainKnowledge`, patch-applied via MemoryAgent, approval-gated via SuggestionService. Mirrors to `backend/data/project-brain/<projectId>/` as markdown.
- **MiMoCode native memory** (SDK): File-based under `~/.local/share/mimocode/memory/`, session-scoped checkpoints/notes, global MEMORY.md for user preferences. Driven by background checkpoint-writer and dream/distill processes.

The only theoretical overlap would be if a user ran both the app AND interactive MiMoCode CLI against the same project directory simultaneously — but even then, ProjectBrain stores data in SQLite while MiMoCode stores data in `~/.local/share/mimocode/memory/`, so they would write to different locations.

---

## Investigation 3 — Does MiMoCode's permission config cover memory writes?

### Question

Can `permission` config keys gate memory file writes (MEMORY.md/checkpoint.md) the same way they gate tool-call permissions?

### Evidence

**Permissions reference** (`~/.local/share/mimocode/builtin_skills/0.1.8/skills/mimocode-docs/reference/permissions.md`), line 39:

> **Configurable tools**
>
> Path/command-keyed (accept the glob-map form): `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `actor`, `external_directory`, `lsp`, `skill`.
>
> Simple action-only: `question`, `webfetch`, `websearch`, `codesearch`, `doom_loop`.

Memory operations (`memory`, `write`, `edit` on memory files) are **not listed** as configurable tools. The permission system governs **tool invocations** — the explicit tool calls the agent makes during a conversation.

**Config reference** (`config.md`), lines 112-129 show that memory/checkpoint operations are configured via dedicated config keys, not via permissions:

```jsonc
{
  "compaction": { "auto": true, "prune": true },
  "checkpoint": { "thresholds": ["40%","60%","80%"] },
  "dream": { "auto": true, "interval_days": 7 },
  "distill": { "auto": true, "interval_days": 30 }
}
```

These are behavioral toggles (on/off, intervals), not permission gates.

**The `edit` tool** (line 39) is listed as configurable — it governs file edits the agent makes during conversation. But the checkpoint writer and dream/distill processes run as **background subagents**, not as user-facing tool calls. The checkpoint-writer agent (referenced in the system prompt) has its own tool allowlist that is separate from the user's permission config.

**`external_directory`** (line 87): "governs reads/writes outside the project working directory — by default these prompt, so MiMoCode never silently widens scope." This applies to the `edit`/`read` tools, not to the memory subsystem which writes to `~/.local/share/mimocode/memory/` (a fixed XDG data path, not a "project working directory" concept).

### Conclusion

**No.** MiMoCode's `permission` config keys gate **tool invocations** (bash, edit, read, glob, etc.) — they do **not** gate memory file writes. Memory operations (checkpoint writing, dream/distill consolidation, MEMORY.md updates) are background processes governed by dedicated config keys (`compaction.*`, `checkpoint.*`, `dream.*`, `distill.*`), which are behavioral toggles (enable/disable, intervals, thresholds) rather than permission gates. There is no way to use `permission` config to deny or ask-before-allowing memory writes specifically.

---

## Investigation 4 — ContextManager.ts injection behavior

### Question

Does `ContextManager.buildInjection()` perform any token-counting, size-limiting, or truncation of the injected Brain content before sending it to the model?

### Evidence

**File:** `backend/src/context/ContextManager.ts`

**`buildInjection()` method** (lines 65-90):
```typescript
buildInjection(projectId: string): ProviderMessage | null {
    if (!env.contextManagerEnabled) {
      return null;
    }
    try {
      const brain = ProjectBrainModel.load(projectId);
      if (!brain.hasContent) {
        return null;
      }
      const content = brain.buildSummary();  // <-- line 79
      return {
        role: 'context',
        content,
        metadata: { type: 'project_context', projectId },
      };
    } catch (err) {
      logger.error({ err, projectId }, 'Failed to build context injection');
      return null;
    }
  },
```

**`ProjectBrainModel.buildSummary()`** (lines 80-123 of `ProjectBrain.ts`):
```typescript
buildSummary(): string {
    const lines: string[] = [];
    const { state, knowledge } = this.brain;
    if (knowledge.overview) { lines.push(`Project: ${knowledge.overview}`); }
    if (state.currentGoal) { lines.push(`Current goal: ${state.currentGoal}`); }
    if (state.currentTask) { lines.push(`Working on: ${state.currentTask}`); }
    if (state.nextStep) { lines.push(`Next step: ${state.nextStep}`); }
    if (state.activeFeature) { lines.push(`Active feature: ${state.activeFeature}`); }
    if (knowledge.decisions.length > 0) {
      const recentDecisions = knowledge.decisions.slice(-3);
      lines.push('Recent decisions:');
      for (const d of recentDecisions) { lines.push(`  - ${d.title}: ${d.rationale}`); }
    }
    if (state.tasks.length > 0) {
      const activeTasks = state.tasks.filter(t => t.status !== 'done');
      if (activeTasks.length > 0) {
        lines.push('Open tasks:');
        for (const t of activeTasks.slice(0, 5)) { lines.push(`  - [${t.status}] ${t.title}`); }
      }
    }
    return lines.join('\n');
  }
```

**Analysis of what is bounded vs. unbounded:**

| Field | Bounded? | How |
|-------|----------|-----|
| `knowledge.overview` | No | Full string included unconditionally |
| `state.currentGoal` | No | Full string included unconditionally |
| `state.currentTask` | No | Full string included unconditionally |
| `state.nextStep` | No | Full string included unconditionally |
| `state.activeFeature` | No | Full string included unconditionally |
| `knowledge.decisions` | Partially | `.slice(-3)` — only last 3 included |
| `state.tasks` | Partially | `.filter(t => t.status !== 'done').slice(0, 5)` — max 5 active tasks |
| `knowledge.architecture` | **Not included** | Excluded from summary entirely |
| `knowledge.techChoices` | **Not included** | Excluded from summary entirely |
| `knowledge.conventions` | **Not included** | Excluded from summary entirely |
| `knowledge.rules` | **Not included** | Excluded from summary entirely |
| `knowledge.userPreferences` | **Not included** | Excluded from summary entirely |
| `state.knownIssues` | **Not included** | Excluded from summary entirely |

**What is NOT done:**
- No token counting (no `countTokens()`, no tiktoken/estimator)
- No size limit check (no `if (content.length > N)`)
- No truncation (no `.slice(0, N)` on the final string)
- No "if too large, drop lowest-priority items" logic

The only size controls are the `.slice(-3)` on decisions and `.slice(0, 5)` on tasks — these are count limits on array fields, not size limits on the output string.

### Conclusion

**No token-counting, size-limiting, or truncation is performed.** `buildInjection()` injects the full serialized Brain summary unconditionally. If a project has a long `overview`, `currentGoal`, `currentTask`, `nextStep`, and `activeFeature`, all of those strings are included at full length. The only size controls are count-based limits on array fields (max 3 decisions, max 5 active tasks). Several Brain knowledge fields (architecture, techChoices, conventions, rules, userPreferences, knownIssues) are excluded from the summary entirely — but this appears to be a design choice for brevity, not a size-limiting mechanism.

**Risk:** If ProjectBrain state grows large (e.g., a very long `currentGoal` or `currentTask` description), the injected context could consume significant tokens with no guard. The downstream provider (MimoServeProvider) passes this directly to `mimo serve` without any size check either (lines 505-526 of MimoServeProvider.ts).
