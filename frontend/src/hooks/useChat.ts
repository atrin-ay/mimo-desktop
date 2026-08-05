import React, { useState, useCallback, useRef } from "react";
import {
  OrbState,
  AgentName,
  Subject,
  Message,
  ActivityEntry,
  Artifact,
} from "../types";
import {
  createSession,
  sendMessage,
  streamChat,
  ModelInfo,
} from "../api";
import useModels from "./useModels";
import useSessions from "./useSessions";
import {
  reduceStreamEvent,
  nextActivityId,
  createActivityEntry,
  type StreamAccumulator,
} from "../lib/streamEventReducer";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export interface UseChatReturn {
  subjects: Subject[];
  activeSubjectId: string;
  sessionId: string | null;
  messages: Message[];
  orbState: OrbState;
  isLoading: boolean;
  backendError: string | null;
  activityLog: ActivityEntry[];
  agent: AgentName;
  setAgent: (agent: AgentName) => void;
  model: string;
  setModel: (model: string) => void;
  models: ModelInfo[];
  modelsLoading: boolean;

  setOrbState: (s: OrbState) => void;
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
  // --- Compose extracted hooks ---
  const { model, setModel, models, modelsLoading, modelsError } = useModels();
  const {
    subjects, activeSubjectId, sessionId, messages,
    setSubjects, setActiveSubjectId, setSessionId, setMessages,
    createNewSession, deleteSubject, switchSubject, sessionsError,
  } = useSessions(language);

  // --- Remaining inline state ---
  const [orbState, setOrbState] = useState<OrbState>(OrbState.Idle);
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [agent, setAgent] = useState<AgentName>('build');

  const abortRef = useRef<AbortController | null>(null);

  // --- Combined backendError (chat + models + sessions) ---
  const backendError = chatError || modelsError || sessionsError;
  const setBackendError = setChatError;

  // --- Execute command / send message ---
  const handleExecuteCommand = useCallback(
    async (cmd: string) => {
      // Abort any previous streaming
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setOrbState(OrbState.Thinking);
      setIsLoading(true);
      setChatError(null);

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
          mode: agent,
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

        console.log(`[MiMo] Sending message in ${agent} mode`);

        // Initialize the stream accumulator (used by reducer and finalize)
        let acc: StreamAccumulator = {
          agentText: "",
          reasoningText: "",
          perMessageEvents: [],
          perMessageArtifacts: [],
          currentActivityId: globalStart.id,
        };

        try {

          for await (const event of streamChat(currentSessionId, cmd, agent, abortRef.current?.signal, model)) {
            // Run the pure reducer
            const result = reduceStreamEvent(event, acc);
            acc = result.accumulator;

            // Apply side effects to React state
            if (result.orbStateToSet) {
              setOrbState(result.orbStateToSet);
            }

            if (result.globalActivityToAdd) {
              const id = nextActivityId();
              setActivityLog((prev) => [
                ...prev,
                { ...result.globalActivityToAdd!, id, timestamp: Date.now() },
              ]);
              acc.currentActivityId = id;
              currentActivityId = id;
            }

            if (result.globalActivitiesToComplete) {
              setActivityLog((prev) =>
                prev.map((a) =>
                  a.status === "running"
                    ? { ...a, status: "completed" as const }
                    : a
                )
              );
            }

            if (result.globalActivitiesToError) {
              setActivityLog((prev) =>
                prev.map((a) =>
                  a.status === "running"
                    ? { ...a, status: "error" as const, detail: result.globalErrorMessage || "Error" }
                    : a
                )
              );
            }

            if (result.messageUpdate) {
              updateMessage(result.messageUpdate);
            }

            if (result.questionMessage) {
              setSubjects((prev) =>
                prev.map((s) =>
                  s.id === currentSessionId
                    ? { ...s, messages: [...s.messages, result.questionMessage!] }
                    : s
                )
              );
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
                agent,
                model
              );
              agentText = response.message.content;
            } catch {
              agentText = "";
            }
          }
        }

        // Finalize message — use acc values (streaming) or agentText (non-streaming fallback)
        const finalText = agentText || acc.agentText;
        if (finalText) {
          updateMessage({
            text: finalText,
            status: "done",
            events: acc.perMessageEvents,
            artifacts: acc.perMessageArtifacts,
            reasoning: acc.reasoningText || undefined,
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
        setChatError(err.message || "Failed to connect to backend");
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
      agent,
      model,
      setSubjects,
      setSessionId,
      setOrbState,
    ]
  );

  // --- Handle answer to a question ---
  const handleAnswer = useCallback(
    async (answer: string) => {
      // Find the pending question in the current session's messages
      const currentSubject = subjects.find(s => s.id === activeSubjectId);
      const pendingQuestion = currentSubject?.messages.find(
        m => m.isQuestion && m.questionRequestID && !m.questionAnswered
      );

      if (pendingQuestion?.questionRequestID) {
        // Send answer via HTTP reply endpoint
        try {
          const { replyToQuestion } = await import("../api");
          await replyToQuestion(pendingQuestion.questionRequestID, [[answer]]);

          // Mark the question as answered in the UI
          setSubjects((prev) =>
            prev.map((s) =>
              s.id === activeSubjectId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === pendingQuestion.id
                        ? { ...m, questionAnswered: true, text: `${m.text}\n\n> ${answer}` }
                        : m
                    ),
                  }
                : s
            )
          );

          // Add the answer as a user message for display
          handleExecuteCommand(answer);
        } catch (err) {
          console.error("Failed to reply to question:", err);
          // Fallback: send as regular message
          handleExecuteCommand(answer);
        }
      } else {
        // No pending question — send as regular message
        handleExecuteCommand(answer);
      }
    },
    [subjects, activeSubjectId, handleExecuteCommand, setSubjects]
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
    agent,
    model,
    models,
    modelsLoading,
    setOrbState,
    setAgent,
    setModel,
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
