/**
 * Fixture: Multi-event sequence exercising legacy/frontend-friendly event types
 *
 * Events: step_start → status → command → file_change → file_read →
 *   file_search → tool_call → state → text → step_finish
 * This exercises the MimoCliProvider event types (status, command,
 * file_change, file_read, file_search, tool_call, state).
 */
import type { StreamEvent } from "../../../api";

export const input: StreamEvent[] = [
  { type: "step_start", timestamp: 1000 },
  { type: "status", timestamp: 1050, agent: "build" },
  { type: "command", timestamp: 1100, detail: "npm install", status: "running" },
  {
    type: "file_change",
    timestamp: 1200,
    tool: "edit",
    detail: "src/App.tsx",
    status: "running",
  },
  { type: "file_read", timestamp: 1300, detail: "README.md", status: "completed" },
  { type: "file_search", timestamp: 1400, detail: "*.test.ts", status: "completed" },
  {
    type: "tool_call",
    timestamp: 1500,
    tool: "glob",
    detail: "src/**/*.tsx",
    status: "completed",
  },
  { type: "state", timestamp: 1600, state: { status: "executing" } as any, label: "Building..." },
  { type: "text", timestamp: 1700, part: { text: "All done." } },
  { type: "step_finish", timestamp: 1800 },
];

export const expected = {
  agentText: "All done.",
  reasoningText: "",
  perMessageEventsCount: 7, // step_start + command + file_change + file_read + file_search + tool_call + state (status has no per-message event)
  perMessageArtifactsCount: 0, // file_change is running, not completed
  orbStateTransitions: [
    "Executing", // step_start
    "Executing", // status (build agent)
    "Executing", // command
    "Executing", // file_change
    // file_read, file_search, tool_call, state do NOT set orbState
    "Streaming", // text
  ],
  globalActivityCount: 2, // step_start + state (command, file_change, file_read, file_search, tool_call do NOT produce global activities — only per-message events)
  messageUpdateCount: 8, // command + file_change + file_read + file_search + tool_call + state + text + step_finish
};
