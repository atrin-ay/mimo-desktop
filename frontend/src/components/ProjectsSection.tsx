import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Folder, 
  FileText, 
  MessageSquare, 
  Plus, 
  Upload, 
  Trash2, 
  Send, 
  User, 
  File, 
  HelpCircle,
  Briefcase,
  ArrowLeft,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface DocumentItem {
  name: string;
  type: string;
  size: string;
}

interface ProjectMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

interface ProjectConversation {
  id: string;
  name: string;
  messages: ProjectMessage[];
}

interface Project {
  id: string;
  name: string;
  date: string;
  dateFa: string;
  documents: DocumentItem[];
  conversations: ProjectConversation[];
}

interface ProjectsSectionProps {
  language: "en" | "fa";
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}

export default function ProjectsSection({ 
  language, 
  projects, 
  setProjects,
  selectedProjectId,
  setSelectedProjectId
}: ProjectsSectionProps) {
  // Local state for the selected conversation inside the active project
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [chatInput, setChatInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  // Resolve active chat thread
  const activeChat = selectedProject?.conversations.find(c => c.id === selectedChatId) || selectedProject?.conversations[0];

  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projects.find(p => p.id === projId);
    if (proj && proj.conversations.length > 0) {
      setSelectedChatId(proj.conversations[0].id);
    } else {
      setSelectedChatId("");
    }
  };

  const handleCreateProject = () => {
    const name = prompt(language === "fa" ? "نام پروژه جدید خود را وارد کنید:" : "Enter new project name:");
    if (!name?.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      date: "Just now",
      dateFa: "اکنون",
      documents: [],
      conversations: [
        { id: `c-${Date.now()}`, name: "General Discussion", messages: [] }
      ]
    };

    setProjects(prev => [...prev, newProj]);
    setSelectedProjectId(newProj.id);
    setSelectedChatId(newProj.conversations[0].id);
  };

  const handleCreateChat = () => {
    if (!selectedProject) return;
    const name = prompt(language === "fa" ? "موضوع گفتگوی جدید پروژه:" : "New Project Conversation Topic:");
    if (!name?.trim()) return;

    const newChat: ProjectConversation = {
      id: `c-${Date.now()}`,
      name: name.trim(),
      messages: []
    };

    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          conversations: [...p.conversations, newChat]
        };
      }
      return p;
    }));
    setSelectedChatId(newChat.id);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedProject || !activeChat) return;

    const userMsg: ProjectMessage = {
      id: `m-${Date.now()}`,
      sender: "user",
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Update conversation with user message
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          conversations: p.conversations.map(c => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                messages: [...c.messages, userMsg]
              };
            }
            return c;
          })
        };
      }
      return p;
    }));

    setChatInput("");

    // Simulate agent answer referencing knowledge base
    setTimeout(() => {
      const docContext = selectedProject.documents.length > 0 
        ? `Based on the uploaded files (${selectedProject.documents.map(d => d.name).join(", ")}): ` 
        : "Based on project context: ";
      const agentMsg: ProjectMessage = {
        id: `m-${Date.now() + 1}`,
        sender: "agent",
        text: `${docContext}I've completed indexing. The system has verified your parameter requirements and compiled the relevant schemas. Let me know how you'd like to proceed!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setProjects(prev => prev.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            conversations: p.conversations.map(c => {
              if (c.id === activeChat.id) {
                return {
                  ...c,
                  messages: [...c.messages, agentMsg]
                };
              }
              return c;
            })
          };
        }
        return p;
      }));
    }, 1500);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0 || !selectedProject) return;

    setIsUploading(true);
    setTimeout(() => {
      const newDocs: DocumentItem[] = Array.from(filesList).map((file: any) => {
        const ext = file.name.split(".").pop() || "pdf";
        return {
          name: file.name,
          type: ext,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        };
      });

      setProjects(prev => prev.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            documents: [...p.documents, ...newDocs]
          };
        }
        return p;
      }));
      setIsUploading(false);
    }, 1200);
  };

  const handleDeleteDocument = (docName: string) => {
    if (!selectedProject) return;
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          documents: p.documents.filter(d => d.name !== docName)
        };
      }
      return p;
    }));
  };

  // Sleek, glowing CSS animated circle representing our AI Character (instead of standard Bot icon)
  const AnimatedCircleAvatar = () => (
    <div className="relative w-7 h-7 rounded-full flex items-center justify-center bg-[#5DF7FF]/10 border border-[#5DF7FF]/35 shadow-[0_0_12px_rgba(93,247,255,0.4)] overflow-hidden shrink-0">
      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-neural-cyan to-electric-blue animate-ping opacity-60 absolute" />
      <div className="w-2.5 h-2.5 rounded-full bg-neural-cyan shadow-[0_0_8px_rgba(93,247,255,1)] relative z-10" />
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-100px)] px-4 py-4 md:px-8 select-none text-left relative overflow-hidden flex flex-col">
      {/* Absolute Ambient Background Glows */}
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-neural-cyan/3 rounded-full filter blur-[100px] pointer-events-none mix-blend-screen" />

      <AnimatePresence mode="wait">
        {!selectedProject ? (
          /* --- 1. CARD-FIRST PROJECTS GRID VIEW --- */
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col h-full overflow-y-auto pb-8"
          >
            {/* Header of Project Grid */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
              <div>
                <span className="text-[9px] font-mono bg-neural-cyan/20 text-neural-cyan px-2.5 py-0.5 rounded uppercase tracking-wider">
                  MIMO REPOSITORIES
                </span>
                <h2 className="text-xl md:text-2xl font-display font-light text-white mt-1.5 tracking-tight">
                  {language === "fa" ? "پروژه‌های شناختی شما" : "Cognitive Project Workspaces"}
                </h2>
                <p className="text-xs text-titanium/50 mt-1 font-sans">
                  {language === "fa" 
                    ? "محیط‌های کاری اختصاصی برای سازماندهی دانش، فایل‌ها و مکالمات مستقل" 
                    : "Encapsulated environments to organize document knowledge, model parameters, and topic discussions."}
                </p>
              </div>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-neural-cyan text-black hover:bg-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-sans shadow-[0_0_15px_rgba(93,247,255,0.15)]"
              >
                <Plus size={14} />
                <span>{language === "fa" ? "پروژه جدید" : "New Project"}</span>
              </button>
            </div>

            {projects.length === 0 ? (
              /* If no project, show button to create first project */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-3xl bg-white/[0.01] max-w-xl mx-auto my-12 backdrop-blur-xl">
                <div className="w-14 h-14 bg-neural-cyan/10 border border-neural-cyan/25 rounded-2xl flex items-center justify-center text-neural-cyan mb-4 animate-pulse">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {language === "fa" ? "هیچ پروژه‌ای یافت نشد" : "No Project Workspaces Found"}
                </h3>
                <p className="text-xs text-titanium/50 mt-2 max-w-sm leading-relaxed font-sans">
                  {language === "fa" 
                    ? "یک پروژه ایجاد کنید تا بتوانید فایل‌ها را بارگذاری کرده و در گفتگوها بر روی موضوع خاص متمرکز شوید." 
                    : "Create a project workspace to safely deposit reference documents, parse parameters, and engage the AI with custom knowledge guides."}
                </p>
                <button
                  onClick={handleCreateProject}
                  className="mt-6 px-5 py-2.5 bg-neural-cyan text-black hover:bg-white text-xs font-semibold rounded-xl transition-all cursor-pointer font-sans shadow-[0_0_20px_rgba(93,247,255,0.2)]"
                >
                  {language === "fa" ? "ایجاد اولین پروژه" : "Create Your First Project"}
                </button>
              </div>
            ) : (
              /* Responsive Series of Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Active Projects Cards */}
                {projects.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => handleSelectProject(proj.id)}
                    className="group relative p-5 bg-white/[0.02] border border-white/5 hover:border-neural-cyan/30 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(93,247,255,0.02)] backdrop-blur-md"
                  >
                    <div className="space-y-4">
                      {/* Top icon and date */}
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-white/5 group-hover:bg-neural-cyan/10 rounded-xl flex items-center justify-center text-titanium/50 group-hover:text-neural-cyan transition-colors border border-white/5">
                          <Briefcase size={16} />
                        </div>
                        <span className="text-[10px] font-mono text-titanium/30 flex items-center gap-1">
                          <Clock size={10} />
                          {language === "fa" ? proj.dateFa : proj.date}
                        </span>
                      </div>

                      {/* Project info */}
                      <div className="space-y-1 text-left">
                        <h3 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                          {proj.name}
                        </h3>
                        <p className="text-[11px] text-titanium/45 line-clamp-2 leading-relaxed font-sans">
                          {language === "fa"
                            ? `${proj.documents.length} فایل بارگذاری شده و ${proj.conversations.length} مکالمه فعال.`
                            : `Dedicated sandbox environment containing ${proj.documents.length} referenced knowledge sheets and ${proj.conversations.length} distinct threads.`}
                        </p>
                      </div>
                    </div>

                    {/* Bottom counts / indicators */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-[10px] font-mono">
                      <div className="flex gap-2.5 text-titanium/40">
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                          <FileText size={10} className="text-neural-cyan/60" />
                          {proj.documents.length} Files
                        </span>
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                          <MessageSquare size={10} className="text-purple-400/60" />
                          {proj.conversations.length} Chats
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-titanium/30 group-hover:text-neural-cyan group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}

                {/* Create Project card representation */}
                <div
                  onClick={handleCreateProject}
                  className="p-5 border border-dashed border-white/10 hover:border-neural-cyan/40 bg-white/[0.005] hover:bg-neural-cyan/[0.01] rounded-2xl flex flex-col justify-center items-center text-center min-h-[200px] cursor-pointer group transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-full border border-dashed border-white/15 flex items-center justify-center text-titanium/40 group-hover:text-neural-cyan group-hover:border-neural-cyan/40 group-hover:scale-110 transition-all mb-3.5">
                    <Plus size={18} />
                  </div>
                  <h4 className="text-xs font-semibold text-titanium/60 group-hover:text-white transition-colors">
                    {language === "fa" ? "ایجاد یک پروژه جدید" : "Create New Project"}
                  </h4>
                  <p className="text-[10px] text-titanium/35 mt-1 max-w-[180px] font-sans">
                    Expand MIMO boundaries with a new sandbox
                  </p>
                </div>

              </div>
            )}
          </motion.div>
        ) : (
          /* --- 2. DETAILED PROJECT VIEW (Workspace layout) --- */
          <motion.div 
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col md:flex-row gap-4 h-full overflow-hidden"
          >
            {/* Left sidebar inside details: Back navigation + Conversation topics list */}
            <div className="w-full md:w-[260px] flex flex-col justify-between bg-white/[0.01] border border-white/5 rounded-2xl p-4 shrink-0 overflow-y-auto">
              <div className="space-y-4">
                
                {/* Back button to return to the card grid */}
                <button
                  onClick={() => setSelectedProjectId("")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-titanium/60 hover:text-white rounded-xl text-xs font-sans font-medium transition-all cursor-pointer text-left"
                >
                  <ArrowLeft size={13} className="text-neural-cyan" />
                  <span>{language === "fa" ? "← بازگشت به پروژه‌ها" : "Back to Projects List"}</span>
                </button>

                {/* Separator line */}
                <div className="border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-titanium/40">
                      {language === "fa" ? "موضوعات گفتگو" : "WORKSPACE THREADS"}
                    </span>
                    <button
                      onClick={handleCreateChat}
                      className="w-5 h-5 bg-white/5 hover:bg-white/10 rounded-md flex items-center justify-center text-neural-cyan transition-colors cursor-pointer"
                      title="New Topic"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-none">
                    {selectedProject.conversations.map(chat => {
                      const isActive = selectedChatId === chat.id;
                      return (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChatId(chat.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-all cursor-pointer truncate ${
                            isActive
                              ? "bg-[#5DF7FF]/10 text-neural-cyan font-bold border border-neural-cyan/15"
                              : "text-titanium/50 hover:text-white hover:bg-white/3"
                          }`}
                        >
                          <MessageSquare size={12} className={isActive ? "text-neural-cyan animate-pulse shrink-0" : "text-titanium/30 shrink-0"} />
                          <span className="truncate flex-1 font-sans">{chat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Knowledge block (Documents) */}
                <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-titanium/40 uppercase tracking-wider">
                      {language === "fa" ? "پایگاه دانش (فایل‌ها)" : "KNOWLEDGE ASSETS"}
                    </span>
                    <button
                      onClick={handleFileUploadClick}
                      disabled={isUploading}
                      className="px-2 py-0.5 bg-neural-cyan/10 hover:bg-neural-cyan text-neural-cyan hover:text-black rounded text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Upload size={9} />
                      {isUploading ? "..." : "Add"}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      multiple 
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.png" 
                    />
                  </div>

                  {/* Document list */}
                  <div className="space-y-1 max-h-[160px] overflow-y-auto scrollbar-thin">
                    {selectedProject.documents.length === 0 ? (
                      <div className="text-[10px] text-titanium/35 text-center py-4 border border-dashed border-white/5 rounded-xl font-sans">
                        Drag or click upload to deposit documents (PDFs, brief, sheets).
                      </div>
                    ) : (
                      selectedProject.documents.map((doc, idx) => (
                        <div key={idx} className="p-2 bg-white/[0.01] hover:bg-white/[0.02] border border-white/3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-left min-w-0 flex-1">
                            <FileText size={11} className="text-neural-cyan shrink-0" />
                            <div className="truncate">
                              <p className="text-[10px] text-white/90 truncate leading-tight font-medium font-sans">{doc.name}</p>
                              <span className="text-[8px] text-titanium/35 font-mono">{doc.size}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteDocument(doc.name)}
                            className="text-titanium/30 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Sidebar footer showing project title name */}
              <div className="text-[9px] text-titanium/30 font-mono text-center pt-3 border-t border-white/5 mt-4 truncate">
                SYNCED: {selectedProject.name.toUpperCase()}
              </div>
            </div>

            {/* Right: Interactive Chat Window (Topic details stream) */}
            <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col overflow-hidden h-full">
              {activeChat ? (
                <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                  
                  {/* Header of active workspace conversation thread */}
                  <div className="p-4 bg-white/[0.01] border-b border-white/5 flex items-center justify-between">
                    <div className="text-left flex items-center gap-3">
                      {/* Beautiful glowing circle AI avatar in active chat header */}
                      <AnimatedCircleAvatar />
                      
                      <div>
                        <span className="text-[8px] font-mono bg-neural-cyan/15 text-neural-cyan px-2 py-0.5 rounded">
                          {selectedProject.name.toUpperCase()} sandbox
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1 leading-none font-sans">{activeChat.name}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Message displays stream */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin text-left">
                    {activeChat.messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6 max-w-sm mx-auto">
                        <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-neural-cyan mb-3">
                          <MessageSquare size={18} />
                        </div>
                        <h4 className="text-xs font-bold text-white font-sans">Index conversation with the Core</h4>
                        <p className="text-[11px] text-titanium/40 mt-1 leading-relaxed font-sans">
                          Awaiting context instructions. The AI has index-read permissions for the {selectedProject.documents.length} linked documents in this workspace.
                        </p>
                      </div>
                    ) : (
                      activeChat.messages.map(msg => {
                        const isUser = msg.sender === "user";
                        return (
                          <div 
                            key={msg.id}
                            className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse text-right" : "text-left"}`}
                          >
                            {/* AI profile avatar is our animated/pulsing circle instead of standard Bot profile */}
                            {isUser ? (
                              <div className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center bg-white/5 shrink-0 text-xs text-titanium/40">
                                <User size={12} />
                              </div>
                            ) : (
                              <AnimatedCircleAvatar />
                            )}
                            
                            <div className="space-y-1">
                              <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                isUser 
                                  ? "bg-white/5 border border-white/5 rounded-tr-none text-white/95" 
                                  : "bg-[#5DF7FF]/5 border border-neural-cyan/10 rounded-tl-none text-[#E2F9FF]"
                              }`}>
                                {msg.text}
                              </div>
                              <span className="text-[8px] font-mono text-titanium/30 block px-1">
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message sending form input */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={language === "fa" ? "ارسال پیام به هوش مصنوعی..." : `Ask inside ${selectedProject.name}...`}
                      className="flex-1 bg-[#121212]/80 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-neural-cyan/35 font-sans placeholder-titanium/30 text-left"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="w-10 h-10 bg-neural-cyan hover:bg-white text-black rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-titanium/40 font-sans">
                  Create or select a conversation thread from the left sub-list to begin.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
