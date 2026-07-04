import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  OrbState,
  InteractionMode,
  Subject,
  Message,
  ActivityEntry,
  Artifact,
  ExportedSession,
  ExportedMessage,
} from "../types";
import {
  createSession,
  getSession,
  sendMessage,
  listCliSessions,
  exportCliSession,
  streamChat,
  deleteCliSession,
  deleteSession,
} from "../api";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const TOOL_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  bash: { icon: "💻", label: "Running command", color: "#a78bfa" },
  read: { icon: "📂", label: "Reading file", color: "#60a5fa" },
  write: { icon: "📝", label: "Writing file", color: "#34d399" },
  edit: { icon: "✏️", label: "Editing file", color: "#fbbf24" },
  glob: { icon: "🔍", label: "Searching files", color: "#38bdf8" },
  grep: { icon: "🔍", label: "Searching content", color: "#38bdf8" },
};

const STATE_ICONS: Record<string, string> = {
  thinking: "🧠",
  planning: "💭",
  reading: "📂",
  searching: "🔍",
  executing: "⚙️",
  generating: "✨",
};

let activityIdCounter = 0;
function nextActivityId() {
  return `act_${Date.now()}_${(activityIdCounter++).toString(36)}`;
}

function createActivityEntry(
  overrides: Omit<ActivityEntry, "id" | "timestamp">
): ActivityEntry {
  return { ...overrides, id: nextActivityId(), timestamp: Date.now() };
}

export interface UseChatReturn {
  subjects: Subject[];
  activeSubjectId: string;
  sessionId: string | null;
  messages: Message[];
  orbState: OrbState;
  isLoading: boolean;
  backendError: string | null;
  activityLog: ActivityEntry[];
  interactionMode: InteractionMode;

  setOrbState: (s: OrbState) => void;
  setInteractionMode: (m: InteractionMode) => void;
  setActiveSubjectId: (id: string) => void;
  setSessionId: (id: string | null) => void;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setBackendError: (e: string | null) => void;

  handleExecuteCommand: (cmd: string) => Promise<void>;
  handleAnswer: (answer: string) => void;
  stopGeneration: () => void;
  createNewSession: () => Promise<void>;
  deleteSubject: (sub: Subject) => Promise<void>;
  switchSubject: (id: string) => void;
}

export default function useChat(language: "en" | "fa"): UseChatReturn {
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: "1",
      name: "New Conversation",
      date: "Just now",
      dateFa: "اکنون",
      status: "Active",
      messages: [],
    },
  ]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("1");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orbState, setOrbState] = useState<OrbState>(OrbState.Idle);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    InteractionMode.Direct
  );

  const abortRef = useRef<AbortController | null>(null);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0];
  const messages = activeSubject ? activeSubject.messages : [];

  // --- Derived messages setter ---
  const setMessages = useCallback(
    (update: Message[] | ((prev: Message[]) => Message[])) => {
      setSubjects((prevSubjects) =>
        prevSubjects.map((s) => {
          if (s.id !== activeSubjectId) return s;
          const newMessages =
            typeof update === "function" ? update(s.messages) : update;
          let name = s.name;
          if (s.messages.length === 0 && newMessages.length > 0) {
            const firstUserMsg = newMessages.find((m) => m.sender === "user");
            if (firstUserMsg) {
              name =
                firstUserMsg.text.slice(0, 45) +
                (firstUserMsg.text.length > 45 ? "..." : "");
            }
          }
          return { ...s, name, messages: newMessages };
        })
      );
    },
    [activeSubjectId]
  );

  // --- Session sync ---
  useEffect(() => {
    const active = subjects.find((s) => s.id === activeSubjectId);
    if (active && isUuid(active.id) && active.id !== sessionId) {
      setSessionId(active.id);
    }
    if (active && !isUuid(active.id) && sessionId) {
      setSessionId(null);
    }
  }, [activeSubjectId, subjects, sessionId]);

  // --- Load session messages ---
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const loadSessionMessages = async () => {
      try {
        const result = await getSession(sessionId);
        if (cancelled) return;

        setSubjects((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: result.messages.map((m) => ({
                id: m.id,
                sender: m.role === "assistant" ? ("agent" as const) : ("user" as const),
                text: m.content,
                timestamp: new Date(m.createdAt).toLocaleTimeString(
                  language === "fa" ? "fa-IR" : "en-US",
                  { hour: "2-digit", minute: "2-digit" }
                ),
                events: [],
                artifacts: [],
              })),
            };
          })
        );
      } catch (err: any) {
        setBackendError(err.message || "Failed to load session");
      }
    };

    loadSessionMessages();
    return () => {
      cancelled = true;
    };
  }, [sessionId, language]);

  // --- Load CLI sessions on mount ---
  useEffect(() => {
    const loadCliSessions = async () => {
      try {
        const cliSessions = await listCliSessions();
        if (cliSessions.length === 0) return;

        const converted: Subject[] = cliSessions.map((s) => ({
          id: s.id,
          name: s.title || "New Session",
          date: new Date(s.updatedAt).toLocaleTimeString(
            language === "fa" ? "fa-IR" : "en-US",
            { hour: "2-digit", minute: "2-digit" }
          ),
          dateFa: new Date(s.updatedAt).toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "Active",
          messages: [],
          category: "personal" as const,
        }));

        const latestSession = cliSessions[0];
        try {
          const exported: ExportedSession = await exportCliSession(latestSession.id);
          if (exported?.messages) {
            const restoredMessages: Message[] = exported.messages
              .filter((m: ExportedMessage) => m.info && m.parts)
              .map((m: ExportedMessage) => ({
                id: m.info.id,
                sender: m.info.role === "user" ? ("user" as const) : ("agent" as const),
                text: m.parts
                  .filter((p: any) => p.type === "text")
                  .map((p: any) => p.text || "")
                  .join(""),
                timestamp: new Date(m.info.time?.created || Date.now()).toLocaleTimeString(
                  language === "fa" ? "fa-IR" : "en-US",
                  { hour: "2-digit", minute: "2-digit" }
                ),
                events: [],
                artifacts: [],
              }))
              .filter((m: Message) => m.text);

            converted[0].messages = restoredMessages;
          }
        } catch {
          // Could not export session
        }

        setSubjects(converted);
        setActiveSubjectId(converted[0].id);
      } catch {
        // Could not load CLI sessions
      }
    };
    loadCliSessions();
  }, [language]);

  // --- Execute command / send message ---
  const handleExecuteCommand = useCallback(
    async (cmd: string) => {
      // Abort any previous streaming
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setOrbState(OrbState.Thinking);
      setIsLoading(true);
      setBackendError(null);

      // Global activity log for backward compat (terminal view)
      const globalStart = createActivityEntry({
        type: "step",
        label: "Starting",
        detail: "Initializing MiMo...",
        icon: "🚀",
        iconColor: "#5DF7FF",
        status: "running",
      });
      setActivityLog([globalStart]);

      try {
        let currentSessionId =
          sessionId || (isUuid(activeSubjectId) ? activeSubjectId : null);
        if (currentSessionId && !sessionId) {
          setSessionId(currentSessionId);
        }

        if (!currentSessionId) {
          const session = await createSession();
          currentSessionId = session.id;
          setSessionId(session.id);

          setSubjects((prev) => {
            const current = prev.find((s) => s.id === activeSubjectId);
            if (current && current.messages.length === 0) {
              return prev.map((s) =>
                s.id === activeSubjectId
                  ? {
                      ...s,
                      id: session.id,
                      name:
                        language === "fa"
                          ? "کانال گفتگوی جدید"
                          : "New Conversation",
                    }
                  : s
              );
            }

            const newSubject: Subject = {
              id: session.id,
              name:
                language === "fa" ? "کانال گفتگوی جدید" : "New Conversation",
              date: "Just now",
              dateFa: "اکنون",
              status: "Active",
              category: "personal",
              messages: [],
            };
            return [newSubject, ...prev];
          });

          setActiveSubjectId(session.id);
        }

        // Add user message
        const userMsg: Message = {
          id: String(Date.now()),
          sender: "user",
          text: cmd,
          timestamp: new Date().toLocaleTimeString(
            language === "fa" ? "fa-IR" : "en-US",
            { hour: "2-digit", minute: "2-digit" }
          ),
          events: [],
          artifacts: [],
        };

        setSubjects((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, userMsg] }
              : s
          )
        );

        // Create streaming agent message
        const agentMsgId = `agent_${Date.now()}`;
        const agentMsg: Message = {
          id: agentMsgId,
          sender: "agent",
          agentName: "MiMo",
          text: "",
          timestamp: new Date().toLocaleTimeString(
            language === "fa" ? "fa-IR" : "en-US",
            { hour: "2-digit", minute: "2-digit" }
          ),
          status: "streaming",
          events: [],
          artifacts: [],
          reasoning: "",
          mode: interactionMode,
        };

        setSubjects((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, agentMsg] }
              : s
          )
        );

        let currentActivityId = globalStart.id;
        let agentText = "";
        let reasoningText = "";
        const perMessageEvents: ActivityEntry[] = [];
        const perMessageArtifacts: Artifact[] = [];

        const updateMessage = (updates: Partial<Message>) => {
          setSubjects((prev) =>
            prev.map((s) => {
              if (s.id !== currentSessionId) return s;
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === agentMsgId ? { ...m, ...updates } : m
                ),
              };
            })
          );
        };

        const addGlobalActivity = (
          entry: Omit<ActivityEntry, "id" | "timestamp">
        ) => {
          const id = nextActivityId();
          setActivityLog((prev) => [
            ...prev,
            { ...entry, id, timestamp: Date.now() },
          ]);
          return id;
        };

        // Mark global start as completed
        setActivityLog((prev) =>
          prev.map((a) =>
            a.id === globalStart.id ? { ...a, status: "completed" as const, detail: "Connected" } : a
          )
        );

        try {
          for await (const event of streamChat(currentSessionId, cmd, interactionMode, abortRef.current?.signal)) {
            switch (event.type) {
              case "step_start": {
                const aid = addGlobalActivity({
                  type: "step",
                  label: "Processing",
                  detail: "MiMo is working...",
                  icon: "⚙️",
                  iconColor: "#94a3b8",
                  status: "running",
                });
                currentActivityId = aid;

                const ev = createActivityEntry({
                  type: "step",
                  label: "Processing",
                  detail: "Working...",
                  icon: "⚙️",
                  iconColor: "#94a3b8",
                  status: "running",
                });
                perMessageEvents.push(ev);
                setOrbState(OrbState.Executing);
                break;
              }

              case "text": {
                if (event.part?.text) {
                  agentText += event.part.text;

                  // Mark any running events as completed
                  perMessageEvents.forEach((e) => {
                    if (e.status === "running") e.status = "completed";
                  });

                  // Force live update with both text and events
                  updateMessage({ text: agentText, events: [...perMessageEvents] });

                  setOrbState(OrbState.Streaming);
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
                  const aid = addGlobalActivity({
                    type: "tool",
                    toolName,
                    label: info.label,
                    detail,
                    icon: info.icon,
                    iconColor: info.color,
                    status: toolStatus,
                  });
                  currentActivityId = aid;

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
                  perMessageEvents.push(ev);

                  // Force live UI update with new events array
                  updateMessage({ events: [...perMessageEvents] });

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

                    perMessageArtifacts.push({
                      id: `art_${Date.now()}`,
                      type: artifactType,
                      name: fileName,
                      path: String(filePath),
                      language: ext,
                    });
                  }

                  setOrbState(OrbState.Executing);
                }
                break;
              }

              case "reasoning": {
                if (event.part?.text) {
                  reasoningText += event.part.text;

                  const ev = createActivityEntry({
                    type: "reasoning",
                    label: "Reasoning",
                    detail: event.part.text.slice(0, 80),
                    icon: "🧠",
                    iconColor: "#c084fc",
                    status: "running",
                  });
                  perMessageEvents.push(ev);

                  // Force live UI update
                  updateMessage({ reasoning: reasoningText, events: [...perMessageEvents] });
                  setOrbState(OrbState.Thinking);
                }
                break;
              }

              case "step_finish": {
                perMessageEvents.forEach((e) => {
                  if (e.status === "running") e.status = "completed";
                });
                // Force live update
                updateMessage({ events: [...perMessageEvents] });
                setActivityLog((prev) =>
                  prev.map((a) =>
                    a.status === "running"
                      ? { ...a, status: "completed" as const }
                      : a
                  )
                );
                break;
              }

              case "error": {
                const errMsg = event.message || "Error";
                perMessageEvents.forEach((e) => {
                  if (e.status === "running") {
                    e.status = "error";
                    e.detail = errMsg;
                  }
                });
                setActivityLog((prev) =>
                  prev.map((a) =>
                    a.status === "running"
                      ? { ...a, status: "error" as const, detail: errMsg }
                      : a
                  )
                );
                setOrbState(OrbState.Error);
                break;
              }

              case "state": {
                if (event.state && event.label) {
                  const stateIcon = STATE_ICONS[String(event.state)] || "⚙️";
                  const aid = addGlobalActivity({
                    type: "step",
                    label: event.label,
                    detail: "",
                    icon: stateIcon,
                    iconColor: "#94a3b8",
                    status: "running",
                  });
                  currentActivityId = aid;

                  const ev = createActivityEntry({
                    type: "step",
                    label: event.label,
                    detail: "",
                    icon: stateIcon,
                    iconColor: "#94a3b8",
                    status: "running",
                  });
                  perMessageEvents.push(ev);
                  // Force live update
                  updateMessage({ events: [...perMessageEvents] });
                }
                break;
              }

              case "question": {
                // MiMo is asking a question — show as interactive card with options
                const questionText = event.part?.text || event.text || event.message || "";
                const questionOptions = event.part?.options || (event as any).options || [];
                if (questionText) {
                  const questionMsg: Message = {
                    id: `question_${Date.now()}`,
                    sender: "system",
                    text: questionText,
                    timestamp: new Date().toLocaleTimeString(
                      language === "fa" ? "fa-IR" : "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    ),
                    events: [],
                    artifacts: [],
                    isQuestion: true,
                    questionOptions: Array.isArray(questionOptions) ? questionOptions : [],
                  };
                  setSubjects((prev) =>
                    prev.map((s) =>
                      s.id === currentSessionId
                        ? { ...s, messages: [...s.messages, questionMsg] }
                        : s
                    )
                  );
                }
                break;
              }

              case "raw": {
                // Non-JSON output from CLI — try to extract useful info
                if (event.text) {
                  agentText += event.text;
                  updateMessage({ text: agentText });
                }
                break;
              }

              case "stderr": {
                // Stderr output — log but don't show to user unless error
                console.log("MiMo stderr:", event.text);
                break;
              }
            }
          }
        } catch (streamErr) {
          // If aborted by user, don't fall back to non-streaming
          if (controller.signal.aborted) {
            console.log("Streaming aborted by user");
          } else {
            // Fallback to non-streaming
            console.log("Streaming failed, falling back:", streamErr);
            try {
              const response = await sendMessage(
                currentSessionId,
                cmd,
                interactionMode
              );
              agentText = response.message.content;
            } catch {
              agentText = "";
            }
          }
        }

        // Finalize message
        if (agentText) {
          updateMessage({
            text: agentText,
            status: "done",
            events: perMessageEvents,
            artifacts: perMessageArtifacts,
            reasoning: reasoningText || undefined,
          });
        } else {
          // Remove empty agent message
          setSubjects((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: s.messages.filter((m) => m.id !== agentMsgId),
                  }
                : s
            )
          );
        }

        setActivityLog((prev) =>
          prev.map((a) =>
            a.status === "running" ? { ...a, status: "completed" as const } : a
          )
        );
        setOrbState(OrbState.Completed);
        setTimeout(() => setOrbState(OrbState.Idle), 2000);
      } catch (err: any) {
        console.error("Chat error:", err);
        setBackendError(err.message || "Failed to connect to backend");
        setOrbState(OrbState.Idle);
        setActivityLog((prev) =>
          prev.map((a) =>
            a.status === "running"
              ? { ...a, status: "error" as const, detail: err.message || "Failed" }
              : a
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      sessionId,
      activeSubjectId,
      language,
      interactionMode,
      setSubjects,
      setSessionId,
      setOrbState,
      setBackendError,
    ]
  );

  // --- Create new session ---
  const createNewSession = useCallback(async () => {
    setBackendError(null);
    try {
      const session = await createSession();
      const newSub: Subject = {
        id: session.id,
        name: language === "fa" ? "کانال گفتگوی جدید" : "New Neural Pipeline",
        date: "Just now",
        dateFa: "اکنون",
        status: "New",
        category: "personal",
        messages: [],
      };
      setSubjects((prev) => [newSub, ...prev]);
      setActiveSubjectId(session.id);
      setSessionId(session.id);
    } catch (err: any) {
      setBackendError(err.message || "Failed to create session");
    }
  }, [language, setSubjects, setSessionId, setBackendError]);

  // --- Delete subject ---
  const deleteSubject = useCallback(
    async (sub: Subject) => {
      const index = subjects.findIndex((s) => s.id === sub.id);
      const isActive = activeSubjectId === sub.id;

      try {
        const promises: Promise<void>[] = [];
        if (isUuid(sub.id)) {
          promises.push(deleteCliSession(sub.id));
          promises.push(deleteSession(sub.id));
        }
        await Promise.all(promises);

        const updated = subjects.filter((s) => s.id !== sub.id);
        setSubjects(updated);
        if (isActive && updated.length > 0) {
          const nextActive = updated[Math.min(index, updated.length - 1)];
          setActiveSubjectId(nextActive.id);
          if (isUuid(nextActive.id)) {
            setSessionId(nextActive.id);
          } else {
            setSessionId(null);
          }
        }
      } catch (err: any) {
        console.error("Failed to delete session:", err);
      }
    },
    [subjects, activeSubjectId, setSubjects, setSessionId]
  );

  // --- Switch subject ---
  const switchSubject = useCallback(
    (id: string) => {
      setActiveSubjectId(id);
      if (isUuid(id)) {
        setSessionId(id);
      }
    },
    [setSessionId]
  );

  // --- Handle answer to a question ---
  const handleAnswer = useCallback(
    (answer: string) => {
      handleExecuteCommand(answer);
    },
    [handleExecuteCommand]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setOrbState(OrbState.Idle);
  }, [setOrbState]);

  return {
    subjects,
    activeSubjectId,
    sessionId,
    messages,
    orbState,
    isLoading,
    backendError,
    activityLog,
    interactionMode,
    setOrbState,
    setInteractionMode,
    setActiveSubjectId,
    setSessionId,
    setSubjects,
    setBackendError,
    handleExecuteCommand,
    handleAnswer,
    stopGeneration,
    createNewSession,
    deleteSubject,
    switchSubject,
  };
}
