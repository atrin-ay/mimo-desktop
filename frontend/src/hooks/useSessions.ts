import React, { useState, useEffect, useCallback } from "react";
import { Subject, Message } from "../types";
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
} from "../api";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export interface UseSessionsReturn {
  subjects: Subject[];
  activeSubjectId: string;
  sessionId: string | null;
  messages: Message[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setActiveSubjectId: (id: string) => void;
  setSessionId: (id: string | null) => void;
  setMessages: (update: Message[] | ((prev: Message[]) => Message[])) => void;
  createNewSession: () => Promise<void>;
  deleteSubject: (sub: Subject) => Promise<void>;
  switchSubject: (id: string) => void;
  sessionsError: string | null;
}

export default function useSessions(language: "en" | "fa"): UseSessionsReturn {
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
  const [sessionsError, setSessionsError] = useState<string | null>(null);

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
            const msgs = result?.messages || [];
            return {
              ...s,
              messages: msgs.map((m) => ({
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
        setSessionsError(err.message || "Failed to load session");
      }
    };

    loadSessionMessages();
    return () => {
      cancelled = true;
    };
  }, [sessionId, language]);

  // --- Load sessions from backend on mount ---
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await listSessions();
        const withMessages = sessions.filter((s) => s.messageCount > 0);
        if (withMessages.length === 0) return;

        const converted: Subject[] = withMessages.map((s) => {
          const title = (s.title || "").trim();
          const name = title
            ? title.slice(0, 45) + (title.length > 45 ? "..." : "")
            : language === "fa"
            ? "گفتگوی جدید"
            : "New Conversation";
          return {
            id: s.id,
            name,
            date: new Date(s.lastActivityAt).toLocaleTimeString(
              language === "fa" ? "fa-IR" : "en-US",
              { hour: "2-digit", minute: "2-digit" }
            ),
            dateFa: new Date(s.lastActivityAt).toLocaleTimeString("fa-IR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "Active",
            category: "personal" as const,
            messages: [],
          };
        });

        setSubjects(converted);
        setActiveSubjectId(converted[0].id);
      } catch (err: any) {
        setSessionsError(err?.message || 'Failed to load sessions');
      }
    };
    loadSessions();
  }, [language]);

  // --- Derived messages ---
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0];
  const messages = activeSubject ? activeSubject.messages : [];

  // --- Create new session ---
  const createNewSession = useCallback(async () => {
    setSessionsError(null);
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
      setSessionsError(err.message || "Failed to create session");
    }
  }, [language, setSubjects, setSessionId]);

  // --- Delete subject ---
  const deleteSubject = useCallback(
    async (sub: Subject) => {
      const index = subjects.findIndex((s) => s.id === sub.id);
      const isActive = activeSubjectId === sub.id;

      try {
        if (isUuid(sub.id)) {
          await deleteSession(sub.id);
        }

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
        setSessionsError(err.message || "Failed to delete session");
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

  return {
    subjects,
    activeSubjectId,
    sessionId,
    messages,
    setSubjects,
    setActiveSubjectId,
    setSessionId,
    setMessages,
    createNewSession,
    deleteSubject,
    switchSubject,
    sessionsError,
  };
}
