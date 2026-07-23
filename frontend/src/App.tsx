import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  OrbState,
  ActiveView,
  Subject,
} from "./types";
import { translations } from "./utils/translations";
import useChat from "./hooks/useChat";
import HomeScreen from "./components/HomeScreen";
import ChatView from "./components/ChatView";
import DashboardSection from "./components/DashboardSection";
import SettingsSection from "./components/SettingsSection";

import {
  Home,
  Menu,
  X,
  Power,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MessageSquare,
  Briefcase,
  Settings,
  Sun,
  Moon,
} from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.Home);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "fa">("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [recentPanelOpen, setRecentPanelOpen] = useState<boolean>(true);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const chat = useChat(language);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );

  const triggerNotification = (text: string) => {
    setNotifications((prev) => [text, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n !== text));
    }, 4500);
  };

  const currentCategory = activeView === ActiveView.Chat ? "personal" : "projects";

  const menuItems = [
    { view: ActiveView.Home, label: "Home", icon: Home },
    { view: ActiveView.Chat, label: "Chat", icon: MessageSquare },
    { view: ActiveView.Projects, label: "Projects", icon: Briefcase },
    { view: ActiveView.Settings, label: "Settings", icon: Settings },
  ];

  const getMenuLabel = (view: any) => {
    const t = translations[language];
    switch (view) {
      case ActiveView.Home: return t.home;
      case ActiveView.Chat: return t.chat;
      case ActiveView.Projects: return t.projects;
      case ActiveView.Settings: return t.settings;
      default: return "";
    }
  };

  return (
    <div
      className={`min-h-screen bg-obsidian text-white flex overflow-hidden relative transition-colors duration-500 ${
        language === "fa" ? "font-fa" : "font-sans"
      } ${theme === "light" ? "light" : ""}`}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#4A8DFF]/8 rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#5DF7FF]/4 rounded-full blur-[110px] pointer-events-none z-0" />

      {/* Left Sidebar Navigation */}
      <nav className={`hidden md:flex flex-col justify-between items-center w-[84px] hover:w-[240px] transition-all duration-300 bg-white/5 border-r border-white/10 p-4 z-40 group relative backdrop-blur-2xl`}>
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

        <div className="flex flex-col items-center group-hover:items-start w-full gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2">
            <Power size={16} className="text-emerald-400 animate-pulse" />
            <span className="hidden group-hover:block text-[10px] font-mono text-emerald-400">
              CORE_ONLINE
            </span>
          </div>
        </div>
      </nav>

      {/* Recent & Projects Panel */}
      <AnimatePresence initial={false}>
        {recentPanelOpen && activeView === ActiveView.Chat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="hidden md:flex flex-col bg-[#0b0c10]/40 border-r border-white/10 h-screen overflow-hidden shrink-0 z-30 select-none backdrop-blur-2xl"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-titanium/70">
                {activeView === ActiveView.Chat
                  ? translations[language].personal
                  : translations[language].projects}
              </span>
              <button
                onClick={() => setRecentPanelOpen(false)}
                className="text-titanium/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                title={translations[language].collapse}
              >
                <ChevronLeft
                  size={16}
                  className={language === "fa" ? "rotate-180" : ""}
                />
              </button>
            </div>

            <div className="p-3">
              <button
                onClick={() => {
                  chat.createNewSession();
                  triggerNotification(
                    language === "fa"
                      ? "کانال گفتگوی عصبی راه‌اندازی شد"
                      : "New neural pipeline initialized"
                  );
                }}
                className="w-full py-2 px-3.5 bg-neural-cyan/10 hover:bg-neural-cyan/20 border border-neural-cyan/25 rounded-xl text-xs font-semibold text-neural-cyan flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus size={14} />
                <span>{translations[language].newChatBtn}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 scrollbar-thin">
              {chat.subjects
                .filter((s) => s.category === currentCategory)
                .map((sub) => {
                  const isActive = chat.activeSubjectId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => chat.switchSubject(sub.id)}
                      className={`group relative px-3 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? "bg-white/5 border-neural-cyan/30 text-neural-cyan"
                          : "bg-transparent border-transparent text-titanium/60 hover:text-white hover:bg-white/3"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <MessageSquare
                          size={13}
                          className={`mt-0.5 shrink-0 ${
                            isActive ? "text-neural-cyan" : "text-titanium/40"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {sub.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-titanium/40">
                            <span>
                              {language === "fa" ? sub.dateFa : sub.date}
                            </span>
                            <span className="text-[8px] bg-white/5 px-1 py-0.2 rounded uppercase">
                              {sub.status === "Active"
                                ? translations[language].active
                                : sub.status === "Completed"
                                ? translations[language].completed
                                : translations[language].saved}
                            </span>
                          </div>
                        </div>
                        {chat.subjects.length > 1 && (
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
              <span className="font-heading font-extrabold text-white text-lg tracking-wider">
                MIMO COGNITIVE OS
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-titanium/50 hover:text-white"
              >
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        {/* Global Navbar */}
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
                <ChevronRight
                  size={15}
                  className={language === "fa" ? "rotate-180" : ""}
                />
              </button>
            )}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-titanium/40">MIMO_OS</span>
              <span className="text-titanium/30">/</span>
              <span className="text-neural-cyan uppercase tracking-wider">
                {getMenuLabel(activeView)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium font-sans text-neural-cyan hover:text-white transition-all cursor-pointer select-none flex items-center gap-1.5 shadow-sm"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun size={13} className="text-neural-cyan animate-pulse" />
              ) : (
                <Moon size={13} className="text-neural-cyan" />
              )}
              <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
            </button>
          </div>
        </header>

        {/* Screen Switcher */}
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
                      setActiveView(ActiveView.Chat);
                    } else {
                      setActiveView(view);
                    }
                  }}
                  onNavigateToProject={() => {}}
                  onNavigateToChat={(chatId) => {
                    chat.switchSubject(chatId);
                    setActiveView(ActiveView.Chat);
                  }}
                  subjects={chat.subjects}
                  projects={[]}
                  orbState={chat.orbState}
                />
              )}

              {activeView === ActiveView.Chat && (() => {
                const chatStarted = chat.messages.length > 0;
                if (chatStarted) {
                  return (
                    <ChatView
                      messages={chat.messages}
                      orbState={chat.orbState}
                      setOrbState={chat.setOrbState}
                      isLoading={chat.isLoading}
                      agent={chat.agent}
                      setAgent={chat.setAgent}
                      model={chat.model}
                      setModel={chat.setModel}
                      models={chat.models}
                      modelsLoading={chat.modelsLoading}
                      onExecute={chat.handleExecuteCommand}
                      onAnswer={chat.handleAnswer}
                      onStop={chat.stopGeneration}
                      language={language}
                    />
                  );
                }
                return (
                  <HomeScreen
                    orbState={chat.orbState}
                    setOrbState={chat.setOrbState}
                    onNavigate={(view) => setActiveView(view)}
                    onTriggerAction={chat.handleExecuteCommand}
                    activeGoals={[]}
                    language={language}
                    setLanguage={setLanguage}
                    agent={chat.agent}
                    setAgent={chat.setAgent}
                  />
                );
              })()}

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
                    ? `آیا از حذف «${deleteTarget.name}» مطمئن هستید؟`
                    : `Delete "${deleteTarget.name}"? This cannot be undone.`}
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
                  onClick={() => {
                    if (deleteTarget) {
                      chat.deleteSubject(deleteTarget);
                      triggerNotification(
                        language === "fa" ? "گفتگو حذف شد" : "Conversation deleted"
                      );
                    }
                    setDeleteTarget(null);
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
