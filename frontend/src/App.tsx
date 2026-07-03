import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  OrbState,
  ActiveView,
  Message,
  FileItem,
  Goal,
  Agent,
  InteractionMode,
  Subject,
  ActivityEntry,
  ExportedSession,
  ExportedMessage
} from "./types";
import { translations } from "./utils/translations";
import { createSession, getSession, sendMessage, listCliSessions, exportCliSession, streamChat, deleteCliSession, deleteSession } from "./api";
import HomeScreen from "./components/HomeScreen";
import DashboardSection from "./components/DashboardSection";
import SettingsSection from "./components/SettingsSection";

import {
  Compass,
  Target,
  Users,
  Database,
  Cpu,
  // Terminal,
  Star,
  Home,
  ArrowRight,
  Menu,
  X,
  Bell,
  Clock,
  User,
  Power,
  // Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MessageSquare,
  Briefcase,
  Bot,
  // Zap,
  // Brain,
  // Plug,
  Settings,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.Home);
  const [orbState, setOrbState] = useState<OrbState>(OrbState.Idle);
  const [currentTime, setCurrentTime] = useState("");
  const [notifications, setNotifications] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "fa">("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.Direct);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: "1",
      name: "New Conversation",
      date: "Just now",
      dateFa: "اکنون",
      status: "Active",
      category: "personal",
      messages: []
    }
  ]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("1");
  const [recentPanelOpen, setRecentPanelOpen] = useState<boolean>(true);

  useEffect(() => {
    const activeSubject = subjects.find((subject) => subject.id === activeSubjectId);
    if (activeSubject && isUuid(activeSubject.id) && activeSubject.id !== sessionId) {
      setSessionId(activeSubject.id);
    }

    if (activeSubject && !isUuid(activeSubject.id) && sessionId) {
      setSessionId(null);
    }
  }, [activeSubjectId, subjects, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    const loadSessionMessages = async () => {
      try {
        const result = await getSession(sessionId);
        if (cancelled) return;

        setSubjects((prevSubjects) =>
          prevSubjects.map((subject) => {
            if (subject.id !== sessionId) {
              return subject;
            }
            return {
              ...subject,
              messages: result.messages.map((message) => ({
                id: message.id,
                sender: message.role === 'assistant' ? 'agent' : 'user',
                text: message.content,
                timestamp: new Date(message.createdAt).toLocaleTimeString(
                  language === 'fa' ? 'fa-IR' : 'en-US',
                  { hour: '2-digit', minute: '2-digit' },
                ),
              })),
            };
          }),
        );
      } catch (err: any) {
        setBackendError(err.message || 'Failed to load session');
      }
    };

    loadSessionMessages();

    return () => {
      cancelled = true;
    };
  }, [sessionId, language]);

  // const [files, setFiles] = useState<FileItem[]>([...]);
  // const [projects, setProjects] = useState<any[]>([...]);
  // const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Derived messages for active subject
  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];
  const messages = activeSubject ? activeSubject.messages : [];

  const setMessages = (update: Message[] | ((prev: Message[]) => Message[])) => {
    setSubjects(prevSubjects => {
      return prevSubjects.map(s => {
        if (s.id === activeSubjectId) {
          const newMessages = typeof update === "function" ? update(s.messages) : update;
          let name = s.name;
          if (s.messages.length === 0 && newMessages.length > 0) {
            const firstUserMsg = newMessages.find(m => m.sender === "user");
            if (firstUserMsg) {
              name = firstUserMsg.text.slice(0, 45) + (firstUserMsg.text.length > 45 ? "..." : "");
            }
          }
          return {
            ...s,
            name,
            messages: newMessages
          };
        }
        return s;
      });
    });
  };

  // const [activeGoals, setActiveGoals] = useState<Goal[]>([...]);
  const [activeGoals] = useState<Goal[]>([]);

  // Handle dynamic system clock updating
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit", 
        hour12: false, 
        timeZoneName: "short" 
      };
      setCurrentTime(date.toLocaleTimeString("en-US", options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Small Notification Helper
  const triggerNotification = (text: string) => {
    setNotifications(prev => [text, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== text));
    }, 4500);
  };

  // Load CLI sessions on startup
  useEffect(() => {
    const loadCliSessions = async () => {
      try {
        const cliSessions = await listCliSessions();
        if (cliSessions.length > 0) {
          // Convert CLI sessions to Subject format
          const converted: Subject[] = cliSessions.map(s => ({
            id: s.id,
            name: s.title || 'New Session',
            date: new Date(s.updatedAt).toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
            dateFa: new Date(s.updatedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
            status: "Active",
            messages: [],
            category: "personal" as const,
          }));

          // Load messages for the most recent session
          const latestSession = cliSessions[0];
          try {
            const exported: ExportedSession = await exportCliSession(latestSession.id);
            if (exported?.messages) {
              const restoredMessages: Message[] = exported.messages
                .filter((m: ExportedMessage) => m.info && m.parts)
                .map((m: ExportedMessage) => ({
                  id: m.info.id,
                  sender: m.info.role === 'user' ? 'user' as const : 'agent' as const,
                  text: m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(''),
                  timestamp: new Date(m.info.time?.created || Date.now()).toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
                }))
                .filter((m: Message) => m.text);

              converted[0].messages = restoredMessages;
            }
          } catch (err) {
            console.log('Could not export session:', err);
          }

          setSubjects(converted);
          setActiveSubjectId(converted[0].id);
        }
      } catch (err) {
        console.log('Could not load CLI sessions:', err);
      }
    };
    loadCliSessions();
  }, [language]);

  // Automated trigger responses to represent true 2030 intelligence simulation
  const handleExecuteCommand = async (cmd: string) => {
    setOrbState(OrbState.Thinking);
    setIsLoading(true);
    setBackendError(null);
    setActivityLog([
      { id: `act_start`, type: 'step', label: 'Starting', detail: 'Initializing MiMo CLI...', icon: '🚀', iconColor: '#5DF7FF', timestamp: Date.now(), status: 'running' }
    ]);

    try {
      let currentSessionId = sessionId || (isUuid(activeSubjectId) ? activeSubjectId : null);
      if (currentSessionId && !sessionId) {
        setSessionId(currentSessionId);
      }

      if (!currentSessionId) {
        const session = await createSession();
        currentSessionId = session.id;
        setSessionId(session.id);

        setSubjects((prev) => {
          const currentSubject = prev.find((subject) => subject.id === activeSubjectId);
          if (currentSubject && currentSubject.messages.length === 0) {
            return prev.map((subject) =>
              subject.id === activeSubjectId
                ? {
                    ...subject,
                    id: session.id,
                    name: language === "fa" ? "کانال گفتگوی جدید" : "New Conversation",
                  }
                : subject,
            );
          }

          const newSubject: Subject = {
            id: session.id,
            name: language === "fa" ? "کانال گفتگوی جدید" : "New Conversation",
            date: language === "fa" ? "اکنون" : "Just now",
            dateFa: language === "fa" ? "اکنون" : "Just now",
            status: "Active",
            category: "personal",
            messages: [],
          };

          return [newSubject, ...prev];
        });

        setActiveSubjectId(session.id);
      }

      const userMsg: Message = {
        id: String(Date.now()),
        sender: "user",
        text: cmd,
        timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
      };

      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === currentSessionId
            ? { ...subject, messages: [...subject.messages, userMsg] }
            : subject,
        ),
      );

      // Stream events from MiMo CLI
      let agentText = '';
      let activityId = `act_start`;

      const updateActivity = (id: string, updates: Partial<ActivityEntry>) => {
        setActivityLog(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      };

      const addActivity = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
        const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setActivityLog(prev => [...prev, { ...entry, id, timestamp: Date.now() }]);
        return id;
      };

      // Mark start as completed
      updateActivity('act_start', { status: 'completed', detail: 'CLI connected' });

      try {
        for await (const event of streamChat(currentSessionId, cmd, interactionMode)) {
          switch (event.type) {
            case 'step_start':
              activityId = addActivity({
                type: 'step',
                label: 'Processing',
                detail: 'MiMo is working...',
                icon: '⚙️',
                iconColor: '#94a3b8',
                status: 'running',
              });
              break;

            case 'text':
              if (event.part?.text) {
                agentText += event.part.text;
                updateActivity(activityId, { status: 'completed' });
              }
              break;

            case 'tool_use':
              if (event.part?.tool) {
                const toolName = event.part.tool;
                const toolIcons: Record<string, { icon: string; label: string; color: string }> = {
                  bash: { icon: '💻', label: 'Running command', color: '#a78bfa' },
                  read: { icon: '📂', label: 'Reading file', color: '#60a5fa' },
                  write: { icon: '📝', label: 'Writing file', color: '#34d399' },
                  edit: { icon: '✏️', label: 'Editing file', color: '#fbbf24' },
                  glob: { icon: '🔍', label: 'Searching files', color: '#38bdf8' },
                  grep: { icon: '🔍', label: 'Searching content', color: '#38bdf8' },
                };
                const info = toolIcons[toolName] || { icon: '⚙️', label: toolName, color: '#94a3b8' };
                const cmd = event.part.state?.input?.command;
                const filePath = event.part.state?.input?.filePath || event.part.state?.input?.path;
                const detail = cmd ? String(cmd).slice(0, 50) : filePath ? String(filePath).split(/[/\\]/).pop() || '' : '';

                activityId = addActivity({
                  type: 'tool',
                  toolName,
                  label: info.label,
                  detail,
                  icon: info.icon,
                  iconColor: info.color,
                  status: event.part.state?.status === 'completed' ? 'completed' : 'running',
                });
              }
              break;

            case 'reasoning':
              if (event.part?.text) {
                activityId = addActivity({
                  type: 'reasoning',
                  label: 'Thinking',
                  detail: event.part.text.slice(0, 80),
                  icon: '🧠',
                  iconColor: '#c084fc',
                  status: 'running',
                });
              }
              break;

            case 'step_finish':
              setActivityLog(prev => prev.map(a => a.status === 'running' ? { ...a, status: 'completed' } : a));
              break;

            case 'error':
              setActivityLog(prev => prev.map(a => a.status === 'running' ? { ...a, status: 'error', detail: event.message || 'Error' } : a));
              break;

            case 'state':
              if (event.state && event.label) {
                const stateIcons: Record<string, string> = {
                  thinking: '🧠',
                  planning: '💭',
                  reading: '📂',
                  searching: '🔍',
                  executing: '⚙️',
                  generating: '✨',
                };
                activityId = addActivity({
                  type: 'step',
                  label: event.label,
                  detail: '',
                  icon: stateIcons[String(event.state)] || '⚙️',
                  iconColor: '#94a3b8',
                  status: 'running',
                });
              }
              break;
          }
        }
      } catch (streamErr) {
        // Fallback to non-streaming if SSE fails
        console.log('Streaming failed, falling back to regular chat:', streamErr);
        const response = await sendMessage(currentSessionId, cmd, interactionMode);
        agentText = response.message.content;
      }

      // Add the final agent message
      if (agentText) {
        const agentMsg: Message = {
          id: `agent_${Date.now()}`,
          sender: "agent",
          agentName: "MiMo",
          text: agentText,
          timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        };

        setSubjects((prev) =>
          prev.map((subject) =>
            subject.id === currentSessionId
              ? { ...subject, messages: [...subject.messages, agentMsg] }
              : subject,
          ),
        );
      }

      setActivityLog(prev => prev.map(a => a.status === 'running' ? { ...a, status: 'completed' } : a));
      setOrbState(OrbState.Completed);
      setTimeout(() => setOrbState(OrbState.Idle), 2000);
    } catch (err: any) {
      console.error('Chat error:', err);
      setBackendError(err.message || 'Failed to connect to backend');
      setOrbState(OrbState.Idle);
      setActivityLog(prev => prev.map(a => a.status === 'running' ? { ...a, status: 'error', detail: err.message || 'Failed' } : a));

      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: "system",
        text: `Error: ${err.message || 'Could not connect to backend. Make sure the backend is running on port 3000.'}`,
        timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectAssistantView = (view: ActiveView) => {
    setActiveView(view);
    const cat = view === ActiveView.Chat ? "personal" : "projects";
    const firstSub = subjects.find(s => s.category === cat);
    if (firstSub) {
      setActiveSubjectId(firstSub.id);
    }
  };

  const getMenuLabel = (view: any) => {
    const t = translations[language];
    switch (view) {
      case ActiveView.Home: return t.home;
      case ActiveView.Chat: return t.chat;
      case ActiveView.Projects: return t.projects;
      case ActiveView.Workspace: return t.navWorkspace;
      case ActiveView.Automations: return t.automations;
      case ActiveView.Memory: return t.memory;
      case ActiveView.Integrations: return t.integrations;
      case ActiveView.Settings: return t.settings;
      default: return "";
    }
  };

  const currentCategory = activeView === ActiveView.Chat ? "personal" : "projects";

  const menuItems = [
    { view: ActiveView.Home, label: "Home", icon: Home },
    { view: ActiveView.Chat, label: "Chat", icon: MessageSquare },
    { view: ActiveView.Projects, label: "Projects", icon: Briefcase },
    { view: ActiveView.Settings, label: "Settings", icon: Settings },
    // STEP 2+ — COMMENTED OUT
    // { view: ActiveView.Workspace, label: "Workspace", icon: Terminal },
    // { view: ActiveView.Automations, label: "Automations", icon: Zap },
    // { view: ActiveView.Memory, label: "Memory", icon: Brain },
    // { view: ActiveView.Integrations, label: "Integrations", icon: Plug },
    // { view: ActiveView.Settings, label: "Settings", icon: Settings }
  ];

  return (
    <div 
      className={`min-h-screen bg-obsidian text-white flex overflow-hidden relative transition-colors duration-500 ${
        language === "fa" ? "font-fa" : "font-sans"
      } ${theme === "light" ? "light" : ""}`}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      {/* Background Ambient Glows from Frosted Glass theme */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#4A8DFF]/8 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#5DF7FF]/4 rounded-full blur-[110px] pointer-events-none z-0"></div>
      
      {/* 1. Left Spatial Sidebar Navigation (Arc Browser / Vision Pro feel) */}
      <nav className={`hidden md:flex flex-col justify-between items-center w-[84px] hover:w-[240px] transition-all duration-300 bg-white/5 border-r border-white/10 p-4 z-40 group relative backdrop-blur-2xl`}>
        
        {/* Core Branding */}
        <div className="flex flex-col items-center group-hover:items-start w-full gap-3 py-3 border-b border-white/10">
          <div 
            onClick={() => setActiveView(ActiveView.Home)}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-neural-cyan to-electric-blue flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(93,247,255,0.2)]"
          >
            <span className="font-heading font-extrabold text-black text-lg">M</span>
          </div>
          <span className="hidden group-hover:block font-heading font-bold text-sm tracking-wider text-luxury mt-1 select-none">
            MIMO COGNITIVE OS
          </span>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col gap-2 w-full my-6 overflow-y-auto max-h-[75vh] scrollbar-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.view;
            return (
              <div key={item.view} className="flex flex-col gap-1 w-full">
                <button
                  onClick={() => {
                    setActiveView(item.view);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 w-full cursor-pointer relative ${
                    active 
                      ? "bg-white/5 text-neural-cyan border border-white/5" 
                      : "text-titanium/50 hover:text-white hover:bg-white/3"
                  }`}
                  title={getMenuLabel(item.view)}
                >
                  <Icon size={18} className={active ? "text-neural-cyan" : "text-titanium/50"} />
                  <span className="hidden group-hover:block text-xs font-medium font-sans truncate select-none">
                    {getMenuLabel(item.view)}
                  </span>

                  {active && (
                    <span className="absolute right-3 w-1 h-1 bg-neural-cyan rounded-full shadow-[0_0_8px_rgba(93,247,255,0.8)]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Metrics (Power status, Time etc.) */}
        <div className="flex flex-col items-center group-hover:items-start w-full gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2">
            <Power size={16} className="text-emerald-400 animate-pulse" />
            <span className="hidden group-hover:block text-[10px] font-mono text-emerald-400">
              CORE_ONLINE
            </span>
          </div>
        </div>
      </nav>

      {/* 1.5 Collapsible Recent & Projects Panel */}
      <AnimatePresence initial={false}>
        {recentPanelOpen && activeView === ActiveView.Chat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="hidden md:flex flex-col bg-[#0b0c10]/40 border-r border-white/10 h-screen overflow-hidden shrink-0 z-30 select-none backdrop-blur-2xl"
          >
            {/* Header of recent panel */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-titanium/70">
                {activeView === ActiveView.Chat ? translations[language].personal : translations[language].projects}
              </span>
              <button
                onClick={() => setRecentPanelOpen(false)}
                className="text-titanium/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                title={translations[language].collapse}
              >
                <ChevronLeft size={16} className={language === "fa" ? "rotate-180" : ""} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={async () => {
                  setBackendError(null);
                  try {
                    const session = await createSession();
                    const newSub: Subject = {
                      id: session.id,
                      name: language === "fa" ? "کانال گفتگوی جدید" : "New Neural Pipeline",
                      date: "Just now",
                      dateFa: "اکنون",
                      status: "New",
                      category: currentCategory,
                      messages: []
                    };
                    setSubjects(prev => [newSub, ...prev]);
                    setActiveSubjectId(session.id);
                    setSessionId(session.id);
                    triggerNotification(language === "fa" ? "کانال گفتگوی عصبی راه‌اندازی شد" : "New neural pipeline initialized");
                  } catch (err: any) {
                    setBackendError(err.message || 'Failed to create session');
                    triggerNotification(language === "fa" ? "ایجاد جلسه موفق نبود" : "Failed to create session");
                  }
                }}
                className="w-full py-2 px-3.5 bg-neural-cyan/10 hover:bg-neural-cyan/20 border border-neural-cyan/25 rounded-xl text-xs font-semibold text-neural-cyan flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus size={14} />
                <span>{translations[language].newChatBtn}</span>
              </button>
            </div>

            {/* Subjects List */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 scrollbar-thin">
              {subjects.filter(s => s.category === currentCategory).map((sub) => {
                const isActive = activeSubjectId === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setActiveSubjectId(sub.id);
                      if (isUuid(sub.id)) {
                        setSessionId(sub.id);
                      }
                      setActiveView(activeView);
                    }}
                    className={`group relative px-3 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-white/5 border-neural-cyan/30 text-neural-cyan"
                        : "bg-transparent border-transparent text-titanium/60 hover:text-white hover:bg-white/3"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <MessageSquare size={13} className={`mt-0.5 shrink-0 ${isActive ? "text-neural-cyan" : "text-titanium/40"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {sub.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-titanium/40">
                          <span>{language === "fa" ? sub.dateFa : sub.date}</span>
                          <span className="text-[8px] bg-white/5 px-1 py-0.2 rounded uppercase">
                            {sub.status === "Active" ? translations[language].active : sub.status === "Completed" ? translations[language].completed : translations[language].saved}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      {subjects.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(sub);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-titanium/30 hover:text-red-400 p-0.5 rounded transition-all cursor-pointer"
                          title="Delete thread"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="fixed inset-0 bg-obsidian z-50 flex flex-col p-6 border-r border-white/10 md:hidden animate-fadeIn"
          >
            <div className="flex justify-between items-center pb-6 border-b border-white/10">
              <span className="font-heading font-extrabold text-white text-lg tracking-wider">MIMO COGNITIVE OS</span>
              <button onClick={() => setSidebarOpen(false)} className="text-titanium/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 my-8 overflow-y-auto max-h-[60vh] scrollbar-none text-left">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.view;

                return (
                  <div key={item.view} className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => {
                        setActiveView(item.view);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-4 p-4 rounded-xl text-sm font-semibold border ${
                        active 
                          ? "bg-neural-cyan/10 border-neural-cyan/30 text-neural-cyan font-bold" 
                          : "bg-white/3 border-white/10 text-titanium/50"
                      }`}
                    >
                      <Icon size={18} />
                      {getMenuLabel(item.view)}
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between font-mono text-xs text-titanium/40">
              <span>MIMO KERNEL v4.0</span>
              <span className="text-emerald-400">ONLINE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main High-Contrast Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        
        {/* Global Dashboard Navbar */}
        <header className="h-[64px] border-b border-white/10 bg-white/5 backdrop-blur-md px-6 flex justify-between items-center z-30 select-none">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-titanium/50 hover:text-white"
            >
              <Menu size={20} />
            </button>
            
            {!recentPanelOpen && activeView === ActiveView.Chat && (
              <button
                onClick={() => setRecentPanelOpen(true)}
                className="hidden md:flex items-center justify-center w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-titanium/50 hover:text-white transition-all cursor-pointer"
                title={translations[language].expand}
              >
                <ChevronRight size={15} className={language === "fa" ? "rotate-180" : ""} />
              </button>
            )}
            
            {/* Context breadcrumb route indicator */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-titanium/40">MIMO_OS</span>
              <span className="text-titanium/30">/</span>
              <span className="text-neural-cyan uppercase tracking-wider">{getMenuLabel(activeView)}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium font-sans text-neural-cyan hover:text-white transition-all cursor-pointer select-none flex items-center gap-1.5 shadow-sm"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun size={13} className="text-neural-cyan animate-pulse" /> : <Moon size={13} className="text-neural-cyan" />}
              <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
            </button>

            {/* Real-time precision clock */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-titanium/60 bg-white/3 px-3 py-1.5 border border-white/5 rounded-xl">
              <Clock size={12} className="text-neural-cyan" />
              <span>{currentTime || "00:00:00 UTC"}</span>
            </div>

            {/* Simulated notification stream alerts */}
            <div className="relative">
              <button 
                className="w-9 h-9 bg-white/3 border border-white/5 rounded-xl flex items-center justify-center text-titanium/50 hover:text-white transition-all hover:bg-white/5 relative"
                title="System Notifications"
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-neural-cyan animate-ping" />
              </button>
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center text-xs shadow-inner">
                🧑‍💻
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-medium text-white/90">Core Architect</span>
                <span className="text-[9px] text-titanium/45 font-mono">L3_SECURITY_CLEAR</span>
              </div>
            </div>
          </div>
        </header>

        {/* Floating notifications list container */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
          <AnimatePresence>
            {notifications.map((notif, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="p-3.5 bg-black/85 border border-neural-cyan/20 text-xs text-white/90 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md"
              >
                <Sparkles size={14} className="text-neural-cyan shrink-0 animate-pulse" />
                <span className="font-mono">{notif}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 3. Screen Switcher Component viewport */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
              {activeView === ActiveView.Home && (
                <DashboardSection
                  language={language}
                  onNavigate={(view) => {
                    if (view === "Chat") {
                      selectAssistantView(ActiveView.Chat);
                    } else {
                      setActiveView(view);
                    }
                  }}
                  onNavigateToProject={() => {}}
                  onNavigateToChat={(chatId) => {
                    setActiveSubjectId(chatId);
                    if (isUuid(chatId)) {
                      setSessionId(chatId);
                    }
                    selectAssistantView(ActiveView.Chat);
                  }}
                  subjects={subjects}
                  projects={[]}
                  orbState={orbState}
                />
              )}

              {activeView === ActiveView.Chat && (
                <HomeScreen
                  orbState={orbState}
                  setOrbState={setOrbState}
                  onNavigate={(view) => setActiveView(view)}
                  onTriggerAction={handleExecuteCommand}
                  activeGoals={activeGoals}
                  language={language}
                  setLanguage={setLanguage}
                  interactionMode={interactionMode}
                  setInteractionMode={setInteractionMode}
                  messages={messages}
                  activityLog={activityLog}
                  isLoading={isLoading}
                />
              )}

              {/* STEP 2+ FEATURES — COMMENTED OUT
              {activeView === ActiveView.Projects && (
                <ProjectsSection
                  language={language}
                  projects={projects}
                  setProjects={setProjects}
                  selectedProjectId={selectedProjectId}
                  setSelectedProjectId={setSelectedProjectId}
                />
              )}

              {activeView === ActiveView.Workspace && (
                <Workspace
                  orbState={orbState}
                  setOrbState={setOrbState}
                  messages={messages}
                  setMessages={setMessages}
                  files={files}
                  setFiles={setFiles}
                  onExecuteCommand={handleExecuteCommand}
                  language={language}
                  setLanguage={setLanguage}
                  interactionMode={interactionMode}
                  setInteractionMode={setInteractionMode}
                />
              )}

              {activeView === ActiveView.Automations && (
                <AutomationsSection
                  language={language}
                  onTriggerAutomation={(prompt) => {
                    selectAssistantView(ActiveView.Chat);
                    setMessages(prev => [
                      ...prev,
                      { id: `auto-${Date.now()}`, sender: "user", text: prompt, timestamp: new Date().toLocaleTimeString() }
                    ]);
                    setOrbState(OrbState.Executing);
                    setTimeout(() => {
                      setMessages(prev => [
                        ...prev,
                        { id: `auto-res-${Date.now()}`, sender: "agent", agentName: "Planning Agent", text: "Automation pipeline executed successfully.", timestamp: new Date().toLocaleTimeString() }
                      ]);
                      setOrbState(OrbState.Idle);
                    }, 2500);
                  }}
                />
              )}

              {activeView === ActiveView.Memory && (
                <MemorySystem />
              )}

              {activeView === ActiveView.Integrations && (
                <IntegrationsSection language={language} />
              )}

              {activeView === ActiveView.Settings && (
                <SettingsSection
                  language={language}
                  theme={theme}
                  setTheme={setTheme}
                />
              )}
              */}

              {activeView === ActiveView.Settings && (
                <SettingsSection
                  language={language}
                  theme={theme}
                  setTheme={setTheme}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#0b0c10] border border-red-400/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.15)] flex flex-col gap-4 relative"
            >
              <button
                onClick={() => setDeleteTarget(null)}
                className="absolute top-4 right-4 text-titanium/40 hover:text-white"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
                  <Trash2 size={16} className="text-red-400" />
                  {language === "fa" ? "حذف گفتگو" : "Delete Conversation"}
                </h3>
                <p className="text-[11px] text-titanium/50 font-mono mt-1">
                  {language === "fa"
                    ? `آیا از حذف «${deleteTarget.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`
                    : `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
                </p>
              </div>

              <div className="flex items-center gap-2 justify-end mt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-3.5 py-2 rounded-xl border border-white/5 bg-white/3 hover:bg-white/10 text-[11px] text-titanium hover:text-white transition-all cursor-pointer font-sans"
                >
                  {language === "fa" ? "انصراف" : "Cancel"}
                </button>
                <button
                  onClick={async () => {
                    const sub = deleteTarget;
                    if (!sub) return;

                    const index = subjects.findIndex(s => s.id === sub.id);
                    const isActive = activeSubjectId === sub.id;

                    try {
                      // Delete from both CLI and backend DB
                      const promises: Promise<void>[] = [];
                      if (isUuid(sub.id)) {
                        promises.push(deleteCliSession(sub.id));
                        promises.push(deleteSession(sub.id));
                      }
                      await Promise.all(promises);

                      const updated = subjects.filter(s => s.id !== sub.id);
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
                      triggerNotification(language === "fa" ? "گفتگو حذف شد" : "Conversation deleted");
                    } catch (err: any) {
                      console.error('Failed to delete session:', err);
                      triggerNotification(language === "fa" ? "خطا در حذف گفتگو" : "Failed to delete conversation");
                    } finally {
                      setDeleteTarget(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold text-[11px] hover:bg-red-600 transition-all cursor-pointer"
                >
                  {language === "fa" ? "حذف" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
