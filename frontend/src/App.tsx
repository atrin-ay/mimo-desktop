import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  OrbState,
  ActiveView,
  Message,
  FileItem,
  Goal,
  Agent,
  InteractionMode,
  Subject
} from "./types";
import { translations } from "./utils/translations";
import { createSession, sendMessage } from "./api";
import HomeScreen from "./components/HomeScreen";
// import Workspace from "./components/Workspace";
// import MemorySystem from "./components/MemorySystem";
import DashboardSection from "./components/DashboardSection";
// import ProjectsSection from "./components/ProjectsSection";
// import AutomationsSection from "./components/AutomationsSection";
// import IntegrationsSection from "./components/IntegrationsSection";
// import SettingsSection from "./components/SettingsSection";

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
  ChevronDown,
  Briefcase,
  Bot,
  // Zap,
  // Brain,
  // Plug,
  // Settings,
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

  // const [files, setFiles] = useState<FileItem[]>([...]);
  // const [projects, setProjects] = useState<any[]>([...]);
  // const [selectedProjectId, setSelectedProjectId] = useState<string>("");

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
  const [assistantDropdownOpen, setAssistantDropdownOpen] = useState<boolean>(true);

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

  // Automated trigger responses to represent true 2030 intelligence simulation
  const handleExecuteCommand = async (cmd: string) => {
    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: cmd,
      timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setOrbState(OrbState.Thinking);
    setIsLoading(true);
    setBackendError(null);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await createSession();
        currentSessionId = session.id;
        setSessionId(session.id);
      }

      const response = await sendMessage(currentSessionId, cmd);

      const agentMsg: Message = {
        id: response.message.id,
        sender: "agent",
        agentName: "MiMo",
        text: response.message.content,
        timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        tokensPerSec: 0
      };

      setMessages(prev => [...prev, agentMsg]);
      setOrbState(OrbState.Completed);
      setTimeout(() => setOrbState(OrbState.Idle), 2000);
    } catch (err: any) {
      console.error('Chat error:', err);
      setBackendError(err.message || 'Failed to connect to backend');
      setOrbState(OrbState.Idle);

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
    const cat = view === ActiveView.AssistantPersonal ? "personal" : "projects";
    const firstSub = subjects.find(s => s.category === cat);
    if (firstSub) {
      setActiveSubjectId(firstSub.id);
    }
  };

  const getMenuLabel = (view: any) => {
    const t = translations[language];
    switch (view) {
      case ActiveView.Home: return t.home;
      case "AssistantParent": return t.assistant;
      case ActiveView.Workspace: return t.navWorkspace;
      case ActiveView.Automations: return t.automations;
      case ActiveView.Memory: return t.memory;
      case ActiveView.Integrations: return t.integrations;
      case ActiveView.Settings: return t.settings;
      case ActiveView.AssistantPersonal: return t.personal;
      case ActiveView.AssistantProjects: return t.projects;
      default: return "";
    }
  };

  const isAssistantView = activeView === ActiveView.AssistantPersonal || activeView === ActiveView.AssistantProjects;
  const currentCategory = activeView === ActiveView.AssistantPersonal ? "personal" : "projects";

  const menuItems = [
    { view: ActiveView.Home, label: "Home", icon: Home },
    { view: "AssistantParent", label: "Assistant", icon: MessageSquare, isParent: true },
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
            
            if (item.isParent) {
              const isAssistantActive = activeView === ActiveView.AssistantPersonal || activeView === ActiveView.AssistantProjects;
              return (
                <div key={item.view} className="flex flex-col gap-1 w-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssistantDropdownOpen(!assistantDropdownOpen);
                    }}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 w-full cursor-pointer relative ${
                      isAssistantActive
                        ? "bg-white/5 text-neural-cyan border border-white/5"
                        : "text-titanium/50 hover:text-white hover:bg-white/3"
                    }`}
                    title={translations[language].assistant}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon size={18} className={isAssistantActive ? "text-neural-cyan" : "text-titanium/50"} />
                      <span className="hidden group-hover:block text-xs font-semibold font-sans truncate select-none">
                        {translations[language].assistant}
                      </span>
                    </div>
                    <ChevronDown 
                      size={14} 
                      className={`hidden group-hover:block transition-transform duration-300 ${
                        assistantDropdownOpen ? "rotate-0" : "-rotate-90"
                      } ${isAssistantActive ? "text-neural-cyan" : "text-titanium/40"}`} 
                    />
                    
                    {/* Active neon dot when collapsed sidebar is active on child */}
                    {isAssistantActive && (
                      <span className="absolute right-3 w-1 h-1 bg-neural-cyan rounded-full shadow-[0_0_8px_rgba(93,247,255,0.8)] md:group-hover:hidden" />
                    )}
                  </button>

                  {/* Submenus (Personal, Projects) - Collapses when sidebar is collapsed */}
                  {assistantDropdownOpen && (
                    <div className="hidden group-hover:flex flex-col gap-1 w-full pl-4 transition-all duration-300">
                      {/* Personal Sub-item */}
                      <button
                        onClick={() => selectAssistantView(ActiveView.AssistantPersonal)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 w-full cursor-pointer relative ${
                          activeView === ActiveView.AssistantPersonal
                            ? "bg-[#5DF7FF]/10 text-neural-cyan border border-neural-cyan/15"
                            : "text-titanium/40 hover:text-white hover:bg-white/3"
                        }`}
                      >
                        <User size={13} className={activeView === ActiveView.AssistantPersonal ? "text-neural-cyan" : "text-titanium/40"} />
                        <span className="text-[11px] font-medium font-sans truncate select-none">
                          {translations[language].personal}
                        </span>
                        {activeView === ActiveView.AssistantPersonal && (
                          <span className="absolute right-2.5 w-1 h-1 bg-neural-cyan rounded-full shadow-[0_0_8px_rgba(93,247,255,0.8)]" />
                        )}
                      </button>

                      {/* Projects Sub-item */}
                      <button
                        onClick={() => selectAssistantView(ActiveView.AssistantProjects)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 w-full cursor-pointer relative ${
                          activeView === ActiveView.AssistantProjects
                            ? "bg-[#5DF7FF]/10 text-neural-cyan border border-neural-cyan/15"
                            : "text-titanium/40 hover:text-white hover:bg-white/3"
                        }`}
                      >
                        <Briefcase size={13} className={activeView === ActiveView.AssistantProjects ? "text-neural-cyan" : "text-titanium/40"} />
                        <span className="text-[11px] font-medium font-sans truncate select-none">
                          {translations[language].projects}
                        </span>
                        {activeView === ActiveView.AssistantProjects && (
                          <span className="absolute right-2.5 w-1 h-1 bg-neural-cyan rounded-full shadow-[0_0_8px_rgba(93,247,255,0.8)]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            }

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
        {recentPanelOpen && activeView === ActiveView.AssistantPersonal && (
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
                {activeView === ActiveView.AssistantPersonal ? translations[language].personal : translations[language].projects}
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
                onClick={() => {
                  const newId = String(Date.now());
                  const newSub: Subject = {
                    id: newId,
                    name: language === "fa" ? "کانال گفتگوی جدید" : "New Neural Pipeline",
                    date: "Just now",
                    dateFa: "اکنون",
                    status: "New",
                    category: currentCategory,
                    messages: []
                  };
                  setSubjects(prev => [newSub, ...prev]);
                  setActiveSubjectId(newId);
                  setActiveView(activeView);
                  triggerNotification(language === "fa" ? "کانال گفتگوی عصبی راه‌اندازی شد" : "New neural pipeline initialized");
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
                            const index = subjects.findIndex(s => s.id === sub.id);
                            const updated = subjects.filter(s => s.id !== sub.id);
                            setSubjects(updated);
                            if (isActive) {
                              const nextActive = updated[Math.min(index, updated.length - 1)];
                              setActiveSubjectId(nextActive.id);
                            }
                            triggerNotification(language === "fa" ? "گفتگو حذف شد" : "Subject deleted");
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

                if (item.isParent) {
                  const isAssistantActive = activeView === ActiveView.AssistantPersonal || activeView === ActiveView.AssistantProjects;
                  return (
                    <div key={item.view} className="flex flex-col gap-2 w-full animate-fadeIn">
                      <button
                        onClick={() => {
                          setAssistantDropdownOpen(!assistantDropdownOpen);
                        }}
                        className={`flex items-center justify-between p-4 rounded-xl text-sm font-semibold border ${
                          isAssistantActive 
                            ? "bg-neural-cyan/10 border-neural-cyan/30 text-neural-cyan font-bold" 
                            : "bg-white/3 border-white/10 text-titanium/50"
                        }`}
                      >
                        <div className="flex items-center gap-4 text-left">
                          <Icon size={18} />
                          <span>{translations[language].assistant}</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform ${assistantDropdownOpen ? "rotate-0" : "-rotate-90"}`} />
                      </button>

                      {assistantDropdownOpen && (
                        <div className="flex gap-2 pl-4">
                          <button
                            onClick={() => {
                              selectAssistantView(ActiveView.AssistantPersonal);
                              setSidebarOpen(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs border ${
                              activeView === ActiveView.AssistantPersonal
                                ? "bg-[#5DF7FF]/10 border-neural-cyan/30 text-neural-cyan font-bold"
                                : "bg-white/3 border-white/5 text-titanium/50"
                            }`}
                          >
                            <User size={14} />
                            {translations[language].personal}
                          </button>

                          <button
                            onClick={() => {
                              selectAssistantView(ActiveView.AssistantProjects);
                              setSidebarOpen(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs border ${
                              activeView === ActiveView.AssistantProjects
                                ? "bg-[#5DF7FF]/10 border-neural-cyan/30 text-neural-cyan font-bold"
                                : "bg-white/3 border-white/5 text-titanium/50"
                            }`}
                          >
                            <Briefcase size={14} />
                            {translations[language].projects}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

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
            
            {!recentPanelOpen && activeView === ActiveView.AssistantPersonal && (
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
                    if (view === "AssistantPersonal") {
                      selectAssistantView(ActiveView.AssistantPersonal);
                    } else {
                      setActiveView(view);
                    }
                  }}
                  onNavigateToProject={() => {}}
                  onNavigateToChat={(chatId) => {
                    setActiveSubjectId(chatId);
                    selectAssistantView(ActiveView.AssistantPersonal);
                  }}
                  subjects={subjects}
                  projects={[]}
                  orbState={orbState}
                />
              )}

              {activeView === ActiveView.AssistantPersonal && (
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
                />
              )}

              {/* STEP 2+ FEATURES — COMMENTED OUT
              {activeView === ActiveView.AssistantProjects && (
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
                    selectAssistantView(ActiveView.AssistantPersonal);
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
            </motion.div>
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
