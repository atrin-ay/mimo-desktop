/**
 * Pure SSE event reducer — no React imports, no hooks, no setState.
 *
 * Takes an SSE event and an accumulator, returns the updated accumulator
 * plus any side effects (global activity entries, orbState changes, etc.)
 * that the calling hook should apply to React state.
 */
import type { StreamEvent } from "../api";
import { OrbState, ActivityEntry, Artifact, Message } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

export const TOOL_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  bash: { icon: "💻", label: "Running command", color: "#a78bfa" },
  read: { icon: "📂", label: "Reading file", color: "#60a5fa" },
  write: { icon: "📝", label: "Writing file", color: "#34d399" },
  edit: { icon: "✏️", label: "Editing file", color: "#fbbf24" },
  glob: { icon: "🔍", label: "Searching files", color: "#38bdf8" },
  grep: { icon: "🔍", label: "Searching content", color: "#38bdf8" },
};

/** Maps frontend-friendly event types to display info */
export const EVENT_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  command: { icon: "💻", label: "Running command", color: "#a78bfa" },
  file_read: { icon: "📂", label: "Reading file", color: "#60a5fa" },
  file_change: { icon: "📝", label: "Editing file", color: "#34d399" },
  file_search: { icon: "🔍", label: "Searching files", color: "#38bdf8" },
  tool_call: { icon: "⚙️", label: "Using tool", color: "#94a3b8" },
};

export const STATE_ICONS: Record<string, string> = {
  thinking: "🧠",
  planning: "💭",
  reading: "📂",
  searching: "🔍",
  executing: "⚙️",
  generating: "✨",
};

// ─── ID generation ──────────────────────────────────────────────────────────

let activityIdCounter = 0;

/** Reset the counter (for testing). */
export function resetActivityIdCounter(): void {
  activityIdCounter = 0;
}

/** Set the counter to a specific value (for deterministic testing). */
export function setActivityIdCounter(value: number): void {
  activityIdCounter = value;
}

export function nextActivityId(): string {
  return `act_${Date.now()}_${(activityIdCounter++).toString(36)}`;
}

export function createActivityEntry(
  overrides: Omit<ActivityEntry, "id" | "timestamp">
): ActivityEntry {
  return { ...overrides, id: nextActivityId(), timestamp: Date.now() };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StreamAccumulator {
  agentText: string;
  reasoningText: string;
  perMessageEvents: ActivityEntry[];
  perMessageArtifacts: Artifact[];
  currentActivityId: string;
}

export interface StreamEventResult {
  accumulator: StreamAccumulator;
  globalActivityToAdd?: Omit<ActivityEntry, "id" | "timestamp">;
  orbStateToSet?: OrbState;
  messageUpdate?: Partial<Message>;
  /** For step_finish/error: mark all running global activities as completed/error */
  globalActivitiesToComplete?: boolean;
  globalActivitiesToError?: boolean;
  globalErrorMessage?: string;
  /** For question events: a new message to add to subjects */
  questionMessage?: Message;
}

// ─── Reducer ────────────────────────────────────────────────────────────────

export function reduceStreamEvent(
  event: StreamEvent,
  acc: StreamAccumulator,
): StreamEventResult {
  // Clone accumulator to avoid mutation
  const newAcc: StreamAccumulator = {
    ...acc,
    perMessageEvents: [...acc.perMessageEvents],
    perMessageArtifacts: [...acc.perMessageArtifacts],
  };

  const result: StreamEventResult = { accumulator: newAcc };

  switch (event.type) {
    case "step_start": {
      result.globalActivityToAdd = {
        type: "step",
        label: "Processing",
        detail: "MiMo is working...",
        icon: "⚙️",
        iconColor: "#94a3b8",
        status: "running",
      };

      const ev = createActivityEntry({
        type: "step",
        label: "Processing",
        detail: "Working...",
        icon: "⚙️",
        iconColor: "#94a3b8",
        status: "running",
      });
      newAcc.perMessageEvents.push(ev);
      result.orbStateToSet = OrbState.Executing;
      break;
    }

    case "text": {
      if (event.part?.text) {
        newAcc.agentText += event.part.text;

        // Mark any running events as completed
        newAcc.perMessageEvents.forEach((e) => {
          if (e.status === "running") e.status = "completed";
        });

        result.messageUpdate = {
          text: newAcc.agentText,
          events: [...newAcc.perMessageEvents],
        };
        result.orbStateToSet = OrbState.Streaming;
      }
      break;
    }

    case "tool_use": {
      if (event.part?.tool) {
        const toolName = event.part.tool;
        const info = TOOL_ICONS[toolName] || {
          icon: "⚙️",
          label: toolName,
          color: "#94a3b8",
        };
        const cmdInput = event.part.state?.input?.command;
        const filePath =
          event.part.state?.input?.filePath ||
          event.part.state?.input?.path;
        const detail = cmdInput
          ? String(cmdInput).slice(0, 50)
          : filePath
          ? String(filePath).split(/[/\\]/).pop() || ""
          : "";

        const toolStatus: "running" | "completed" | "error" =
          event.part.state?.status === "completed"
            ? "completed"
            : "running";

        // Global activity
        result.globalActivityToAdd = {
          type: "tool",
          toolName,
          label: info.label,
          detail,
          icon: info.icon,
          iconColor: info.color,
          status: toolStatus,
        };

        // Per-message event
        const ev = createActivityEntry({
          type: "tool",
          toolName,
          label: info.label,
          detail,
          icon: info.icon,
          iconColor: info.color,
          status: toolStatus,
        });
        newAcc.perMessageEvents.push(ev);

        result.messageUpdate = { events: [...newAcc.perMessageEvents] };

        // Artifact detection: write tool with completed status
        if (
          toolName === "write" &&
          toolStatus === "completed" &&
          filePath
        ) {
          const fileName = String(filePath).split(/[/\\]/).pop() || "file";
          const ext = fileName.split(".").pop()?.toLowerCase() || "";
          const artifactType: Artifact["type"] =
            ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)
              ? "image"
              : ["js", "ts", "tsx", "jsx", "py", "rs", "go", "java", "cpp", "c", "rb", "php", "vue", "svelte"].includes(ext)
              ? "code"
              : "file";

          newAcc.perMessageArtifacts.push({
            id: `art_${Date.now()}`,
            type: artifactType,
            name: fileName,
            path: String(filePath),
            language: ext,
          });
        }

        result.orbStateToSet = OrbState.Executing;
      }
      break;
    }

    case "status": {
      const statusAgent = event.agent || "build";
      if (statusAgent === "build") {
        result.orbStateToSet = OrbState.Executing;
      } else if (statusAgent === "plan") {
        result.orbStateToSet = OrbState.Thinking;
      } else if (statusAgent === "compose") {
        result.orbStateToSet = OrbState.Thinking;
      } else {
        result.orbStateToSet = OrbState.Streaming;
      }
      break;
    }

    case "command": {
      const cmdDetail = event.detail || "";
      const cmdStatus: "running" | "completed" | "error" =
        event.status === "completed" ? "completed" : "running";

      const cmdEv = createActivityEntry({
        type: "tool",
        toolName: "bash",
        label: "Running command",
        detail: cmdDetail,
        icon: "💻",
        iconColor: "#a78bfa",
        status: cmdStatus,
      });
      newAcc.perMessageEvents.push(cmdEv);
      result.messageUpdate = { events: [...newAcc.perMessageEvents] };
      result.orbStateToSet = OrbState.Executing;
      break;
    }

    case "file_change": {
      const fileDetail = event.detail || "";
      const fileStatus: "running" | "completed" | "error" =
        event.status === "completed" ? "completed" : "running";

      const fileEv = createActivityEntry({
        type: "tool",
        toolName: event.tool || "edit",
        label: "Editing file",
        detail: fileDetail,
        icon: "📝",
        iconColor: "#34d399",
        status: fileStatus,
      });
      newAcc.perMessageEvents.push(fileEv);
      result.messageUpdate = { events: [...newAcc.perMessageEvents] };

      // Artifact detection for completed file writes
      if (fileStatus === "completed" && fileDetail) {
        const ext = fileDetail.split(".").pop()?.toLowerCase() || "";
        const artifactType: Artifact["type"] =
          ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)
            ? "image"
            : ["js", "ts", "tsx", "jsx", "py", "rs", "go", "java", "cpp", "c", "rb", "php", "vue", "svelte"].includes(ext)
            ? "code"
            : "file";

        newAcc.perMessageArtifacts.push({
          id: `art_${Date.now()}`,
          type: artifactType,
          name: fileDetail,
          language: ext,
        });
      }

      result.orbStateToSet = OrbState.Executing;
      break;
    }

    case "file_read": {
      const readEv = createActivityEntry({
        type: "tool",
        toolName: "read",
        label: "Reading file",
        detail: event.detail || "",
        icon: "📂",
        iconColor: "#60a5fa",
        status: event.status === "completed" ? "completed" : "running",
      });
      newAcc.perMessageEvents.push(readEv);
      result.messageUpdate = { events: [...newAcc.perMessageEvents] };
      break;
    }

    case "file_search": {
      const searchEv = createActivityEntry({
        type: "tool",
        toolName: "glob",
        label: "Searching files",
        detail: event.detail || "",
        icon: "🔍",
        iconColor: "#38bdf8",
        status: event.status === "completed" ? "completed" : "running",
      });
      newAcc.perMessageEvents.push(searchEv);
      result.messageUpdate = { events: [...newAcc.perMessageEvents] };
      break;
    }

    case "tool_call": {
      const tcInfo = EVENT_ICONS[event.tool] || EVENT_ICONS.tool_call;
      const tcEv = createActivityEntry({
        type: "tool",
        toolName: event.tool || "unknown",
        label: tcInfo.label,
        detail: event.detail || "",
        icon: tcInfo.icon,
        iconColor: tcInfo.color,
        status: event.status === "completed" ? "completed" : "running",
      });
      newAcc.perMessageEvents.push(tcEv);
      result.messageUpdate = { events: [...newAcc.perMessageEvents] };
      break;
    }

    case "reasoning": {
      if (event.part?.text) {
        newAcc.reasoningText += event.part.text;

        const ev = createActivityEntry({
          type: "reasoning",
          label: "Reasoning",
          detail: event.part.text.slice(0, 80),
          icon: "🧠",
          iconColor: "#c084fc",
          status: "running",
        });
        newAcc.perMessageEvents.push(ev);

        result.messageUpdate = {
          reasoning: newAcc.reasoningText,
          events: [...newAcc.perMessageEvents],
        };
        result.orbStateToSet = OrbState.Thinking;
      }
      break;
    }

    case "step_finish": {
      newAcc.perMessageEvents.forEach((e) => {
        if (e.status === "running") e.status = "completed";
      });
      result.messageUpdate = { events: [...newAcc.perMessageEvents] };
      result.globalActivitiesToComplete = true;
      break;
    }

    case "error": {
      const errMsg = event.message || "Error";
      newAcc.perMessageEvents.forEach((e) => {
        if (e.status === "running") {
          e.status = "error";
          e.detail = errMsg;
        }
      });
      result.globalActivitiesToError = true;
      result.globalErrorMessage = errMsg;
      result.orbStateToSet = OrbState.Error;
      break;
    }

    case "state": {
      if (event.state && event.label) {
        const stateIcon = STATE_ICONS[String(event.state)] || "⚙️";

        result.globalActivityToAdd = {
          type: "step",
          label: event.label,
          detail: "",
          icon: stateIcon,
          iconColor: "#94a3b8",
          status: "running",
        };

        const ev = createActivityEntry({
          type: "step",
          label: event.label,
          detail: "",
          icon: stateIcon,
          iconColor: "#94a3b8",
          status: "running",
        });
        newAcc.perMessageEvents.push(ev);
        result.messageUpdate = { events: [...newAcc.perMessageEvents] };
      }
      break;
    }

    case "question": {
      const questionText = event.part?.text || event.text || event.message || event.properties?.questions?.[0]?.question || "";
      const questionOptions = event.part?.options || (event as any).options || [];
      const requestID = event.properties?.id || event.id || event.requestID;

      // Format options as strings if they are objects
      const formattedOptions = Array.isArray(questionOptions)
        ? questionOptions.map((opt: any) =>
            typeof opt === "string" ? opt : (opt.label || opt.name || String(opt))
          )
        : [];

      // Only create a question message if there are structured options (2+)
      if (formattedOptions.length >= 2 && questionText) {
        const questionHeader = event.properties?.questions?.[0]?.header || "";
        const questionMultiple = event.properties?.questions?.[0]?.multiple || false;
        const questionCustom = event.properties?.questions?.[0]?.custom !== false;

        result.questionMessage = {
          id: `question_${Date.now()}`,
          sender: "system",
          text: questionText,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          events: [],
          artifacts: [],
          isQuestion: true,
          questionOptions: formattedOptions,
          questionRequestID: requestID,
          questionHeader,
          questionMultiple,
          questionCustom,
        };
      }
      break;
    }

    case "raw": {
      if (event.text) {
        newAcc.agentText += event.text;
        result.messageUpdate = { text: newAcc.agentText };
      }
      break;
    }

    case "stderr": {
      // Stderr output — log but don't show to user unless error
      console.log("MiMo stderr:", event.text);
      break;
    }
  }

  return result;
}
