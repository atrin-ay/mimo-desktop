import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, 
  MessageSquare, 
  FileText, 
  Code, 
  Activity, 
  Database, 
  Cpu, 
  Search, 
  Sparkles, 
  Play, 
  RotateCcw, 
  Download, 
  CheckCircle, 
  ExternalLink, 
  Clock, 
  Send,
  Sliders,
  Maximize2,
  Minimize2,
  Trash2,
  Wrench,
  Globe,
  Share2,
  Plus,
  ChevronDown,
  Paperclip,
  Upload,
  Check,
  ChevronRight,
  Filter,
  UserPlus,
  Briefcase,
  X,
  FileCode,
  FolderOpen,
  Settings,
  User
} from "lucide-react";
import { Message, FileItem, OrbState, AgentName } from "../types";
import { translations } from "../utils/translations";

interface WorkspaceProps {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  onExecuteCommand: (cmd: string) => void;
  language: "en" | "fa";
  setLanguage: (lang: "en" | "fa") => void;
  agent: AgentName;
  setAgent: (agent: AgentName) => void;
}

const localization = {
  en: {
    workspace: "Workspace",
    searchFiles: "Search files...",
    files: "Files",
    folders: "Folders",
    data: "Data",
    dragDrop: "Drag & drop files here or click to upload",
    mbUsed: "12.4 MB of 100 MB used",
    contextTokens: "Context Tokens",
    activeAgents: "Active Agents",
    inviteAgent: "Invite Agent",
    newTask: "New Task",
    chat: "Chat",
    code: "Code",
    artifacts: "Artifacts",
    webSearch: "Web Search",
    settings: "Settings",
    askAnything: "Ask anything or @mention an agent...",
    explainCode: "Explain code",
    addTests: "Add tests",
    checkSecurity: "Check security",
    console: "Console",
    tests: "Tests",
    simulation: "Simulation",
    deployments: "Deployments",
    runSimulation: "Run Simulation",
    buildSuccessful: "Build successful",
    compiling: "Running target/deploy/vesting_program.so...",
    suggest1: "Explain Code",
    suggest2: "Add Tests",
    suggest3: "Check Security",
    suggestMore: "...",
    codeAgent: "Code Agent",
    researchAgent: "Research Agent",
    securityAgent: "Security Agent",
    judgeAgent: "Judge Agent",
    rust: "Rust",
    createdFiles: "Created files",
    keyFeatures: "Key features",
    cliff: "6-month cliff period",
    linear: "Linear release over 24 months",
    withdraw: "Secure withdrawal mechanism",
    admin: "Admin controls for updates",
    question: "Would you like me to add any additional features?",
    you: "You",
    userMsgText: "Create a vesting contract with a 6-month cliff and linear release over 24 months.",
    agentMsgText: "I'll create a Solana vesting contract with the requested parameters:",
    foldersList: ["tests", "scripts", "target", "docs"],
    uploadSuccess: "File uploaded to neural directory!",
    simulationSuccess: "Simulation completed! Transaction: 5HmhX...9kL2",
    noFileSelected: "No file selected. Click on a file from the sidebar to open the editor.",
    placeholderCode: "// Select or create a file to start coding..."
  },
  fa: {
    workspace: "فضای کاری",
    searchFiles: "جستجوی فایل‌ها...",
    files: "فایل‌ها",
    folders: "پوشه‌ها",
    data: "دیتا",
    dragDrop: "فایل‌ها را به اینجا بکشید یا برای بارگذاری کلیک کنید",
    mbUsed: "۱۲.۴ مگابایت از ۱۰۰ مگابایت مصرف شده است",
    contextTokens: "توکن‌های زمینه",
    activeAgents: "عامل‌های فعال",
    inviteAgent: "دعوت عامل",
    newTask: "وظیفه جدید",
    chat: "گفتگو",
    code: "کد",
    artifacts: "آرتیفکت‌ها",
    webSearch: "جستجوی وب",
    settings: "تنظیمات",
    askAnything: "هر سوالی دارید بپرسید یا یک عامل را منشن کنید...",
    explainCode: "توضیح کد",
    addTests: "افزودن تست",
    checkSecurity: "بررسی امنیت",
    console: "کنسول",
    tests: "تست‌ها",
    simulation: "شبیه‌سازی",
    deployments: "استقرارها",
    runSimulation: "اجرای شبیه‌سازی",
    buildSuccessful: "ساخت موفقیت‌آمیز بود",
    compiling: "در حال اجرای target/deploy/vesting_program.so...",
    suggest1: "توضیح کد",
    suggest2: "افزودن تست",
    suggest3: "بررسی امنیت",
    suggestMore: "...",
    codeAgent: "عامل کدنویسی",
    researchAgent: "عامل تحقیقاتی",
    securityAgent: "عامل امنیت",
    judgeAgent: "عامل ناظر",
    rust: "راست",
    createdFiles: "فایل‌های ایجاد شده",
    keyFeatures: "ویژگی‌های کلیدی",
    cliff: "دوره صخره ۶ ماهه",
    linear: "آزادسازی خطی در طول ۲۴ ماه",
    withdraw: "مکانیزم برداشت امن با امنیت بالا",
    admin: "کنترل‌های مدیریتی برای اعمال به‌روزرسانی",
    question: "آیا مایلید ویژگی‌های دیگری را نیز به این قرارداد اضافه کنم؟",
    you: "شما",
    userMsgText: "یک قرارداد هوشمند آزادسازی توکن (Vesting) روی شبکه سولانا با دوره صخره ۶ ماهه و آزادسازی خطی ۲۴ ماهه بساز.",
    agentMsgText: "قرارداد هوشمند وستینگ سولانا را بر اساس نیازمندی‌های درخواستی شما با مشخصات زیر طراحی و ایجاد کردم:",
    foldersList: ["تست‌ها", "اسکریپت‌ها", "تارگت", "مستندات"],
    uploadSuccess: "فایل با موفقیت در دایرکتوری بارگذاری شد!",
    simulationSuccess: "شبیه‌سازی با موفقیت انجام شد! شناسه تراکنش: 5HmhX...9kL2",
    noFileSelected: "هیچ فایلی انتخاب نشده است. از منوی کناری روی یک فایل کلیک کنید تا ادیتور باز شود.",
    placeholderCode: "// جهت شروع کدنویسی، یک فایل را انتخاب یا ایجاد نمایید..."
  }
};

export default function Workspace({
  orbState,
  setOrbState,
  messages,
  setMessages,
  files,
  setFiles,
  onExecuteCommand,
  language,
  setLanguage,
  agent,
  setAgent
}: WorkspaceProps) {
  // Sleek, glowing CSS animated circle representing our AI Character
  const AnimatedCircleAvatar = () => (
    <div className="relative w-6 h-6 rounded-full flex items-center justify-center bg-[#5DF7FF]/10 border border-[#5DF7FF]/35 shadow-[0_0_12px_rgba(93,247,255,0.4)] overflow-hidden shrink-0">
      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-neural-cyan to-electric-blue animate-ping opacity-60 absolute" />
      <div className="w-2 h-2 rounded-full bg-neural-cyan shadow-[0_0_8px_rgba(93,247,255,1)] relative z-10" />
    </div>
  );

  // Localization setup
  const loc = localization[language];
  const t = translations[language];

  // Component States
  const [middleTab, setMiddleTab] = useState<"chat" | "code" | "artifacts" | "research" | "settings">("chat");
  const [activeFile, setActiveFile] = useState<FileItem | null>(files[0] || null);
  const [fileContent, setFileContent] = useState(files[0]?.content || "");
  const [inputText, setInputText] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationLogs, setCompilationLogs] = useState<string[]>([
    `✓ ${loc.buildSuccessful}`,
    "Finished dev [unoptimized + debuginfo] target(s) in 2.34s",
    "Running target/deploy/vesting_program.so",
    "Program deployed successfully",
    "Transaction: 5HmhX...9kL2"
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [webQuery, setWebQuery] = useState("");
  const [researchLogs, setResearchLogs] = useState<{ query: string; citations: string[]; findings: string[] }[]>([
    {
      query: "Solana program optimization under Anchor 0.29",
      citations: [
        "https://docs.anchor-lang.com/developers/optimization",
        "https://solana.com/developers/guides/program-security"
      ],
      findings: [
        "Zero-copy account serialization offers substantial compute unit savings for larger state structs.",
        "Ensure mathematical boundaries are safe against overflow via checked math operations."
      ]
    }
  ]);

  // Sidebar Tab
  const [sidebarTab, setSidebarTab] = useState<"files" | "folders" | "data">("files");

  // Model Selector
  const [selectedModel, setSelectedModel] = useState("GPT-4o");

  // File system simulation ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeFile) {
      setFileContent(activeFile.content);
    }
  }, [activeFile]);

  // Handle send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onExecuteCommand(inputText);
    setInputText("");
  };

  // Sync file content back to list
  const handleFileChange = (content: string) => {
    setFileContent(content);
    if (activeFile) {
      const updatedFiles = files.map(f => f.path === activeFile.path ? { ...f, content } : f);
      setFiles(updatedFiles);
    }
  };

  // Create new file
  const createNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    const path = `/src/custom/${newFileName.trim()}`;
    if (files.some(f => f.path === path)) {
      alert("A file with this name already exists!");
      return;
    }
    
    const extension = newFileName.split('.').pop() || '';
    let fileType: "code" | "document" | "json" | "image" = "code";
    if (["json"].includes(extension)) fileType = "json";
    else if (["md", "txt"].includes(extension)) fileType = "document";
    else if (["png", "jpg", "jpeg", "svg"].includes(extension)) fileType = "image";

    const newFile: FileItem = {
      name: newFileName.trim(),
      type: fileType,
      size: "0.1 KB",
      path: path,
      content: `// New file ${newFileName.trim()}\n// Created in MIMO Cognitive Workspace\n\n`
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
    setNewFileName("");
    setShowNewFileModal(false);
  };

  // Code Simulation trigger
  const runCodeCompilation = () => {
    setIsCompiling(true);
    setOrbState(OrbState.Executing);
    setCompilationLogs([
      "[SYSTEM_INIT] Spinning build and simulation worker...",
      "[CONFIG] Loading Cargo compilation keys..."
    ]);

    setTimeout(() => {
      setCompilationLogs(prev => [
        ...prev,
        `[COMPILING] Processing Anchor program: ${activeFile?.name || "vesting_program.rs"}`,
        `[AST] Syntactic graph constructed with 99.4% precision`
      ]);
    }, 800);

    setTimeout(() => {
      setCompilationLogs(prev => [
        ...prev,
        `[OPTIMIZER] Verification finished. Mathematical overflows protected.`,
        `[RUN] Executing testing simulation vector...`
      ]);
    }, 1600);

    setTimeout(() => {
      setCompilationLogs(prev => [
        ...prev,
        `✓ ${loc.buildSuccessful}`,
        "Finished dev [unoptimized + debuginfo] target(s) in 1.84s",
        loc.compiling,
        loc.simulationSuccess
      ]);
      setIsCompiling(false);
      setOrbState(OrbState.Completed);
      setTimeout(() => setOrbState(OrbState.Idle), 2000);
    }, 2600);
  };

  // Web research search query
  const handleResearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webQuery.trim()) return;

    setOrbState(OrbState.Researching);
    const newResearch = {
      query: webQuery,
      citations: [
        `https://scholar.google.com/search?q=${encodeURIComponent(webQuery)}`,
        `https://mimo.ai/research/crawler-${Date.now()}`
      ],
      findings: [
        `Extracted semantic matches for query "${webQuery}" inside Anchor Solana ecosystem.`,
        "Verified decentralized consensus mechanisms against secure telemetry networks."
      ]
    };

    setResearchLogs(prev => [newResearch, ...prev]);
    setWebQuery("");
    setTimeout(() => setOrbState(OrbState.Idle), 1800);
  };

  // Trigger file upload simulation
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const uploadedFile = fileList[0];
      const newFileItem: FileItem = {
        name: uploadedFile.name,
        type: "code",
        size: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
        path: `/src/custom/${uploadedFile.name}`,
        content: `// Uploaded file: ${uploadedFile.name}\n// Registered inside secure sandbox runtime\n\n`
      };
      setFiles(prev => [...prev, newFileItem]);
      setActiveFile(newFileItem);
      alert(loc.uploadSuccess);
    }
  };

  // Filtering file list
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100vh-64px)] p-4 md:p-6 select-none overflow-hidden flex flex-col">
      
      {/* 3-Column Workspace Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden items-stretch">
        
        {/* ========================================================= */}
        {/* COLUMN 1: LEFT WORKSPACE SIDEBAR DIRECTORY (lg:col-span-3) */}
        {/* ========================================================= */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-black/35 border border-white/10 rounded-2xl h-full overflow-hidden backdrop-blur-xl relative">
          
          {/* Header row inside column */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neural-cyan shadow-[0_0_10px_rgba(93,247,255,0.5)]" />
              <span className="font-heading font-bold text-sm tracking-wide text-white uppercase">{loc.workspace}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowNewFileModal(true)}
                className="w-7 h-7 bg-white/5 hover:bg-white/10 hover:text-neural-cyan rounded-lg flex items-center justify-center text-titanium/50 transition-all cursor-pointer border border-white/5"
                title={language === "fa" ? "ایجاد فایل جدید" : "New File"}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Project dropdown select */}
          <div className="p-3 border-b border-white/5 bg-white/[0.01] flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-semibold text-white/95 cursor-pointer">
              <div className="flex items-center gap-2">
                <Briefcase size={13} className="text-neural-cyan" />
                <span>Solana Vesting Project</span>
              </div>
              <ChevronDown size={13} className="text-titanium/50" />
            </div>
            <button className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition-all cursor-pointer">
              <Plus size={14} />
            </button>
          </div>

          {/* Search box and filter */}
          <div className="p-3 border-b border-white/5 flex gap-1.5 items-center">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-titanium/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={loc.searchFiles}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-titanium/30 focus:outline-none focus:border-neural-cyan/35 transition-colors font-sans"
              />
            </div>
            <button className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-titanium/50 hover:text-white transition-all cursor-pointer">
              <Filter size={12} />
            </button>
          </div>

          {/* Directory tabs */}
          <div className="px-3 pt-2.5 flex border-b border-white/5 gap-1 select-none text-[10px] font-bold tracking-wider uppercase">
            {[
              { id: "files", label: loc.files, icon: FileCode },
              { id: "folders", label: loc.folders, icon: FolderOpen },
              { id: "data", label: loc.data, icon: Database }
            ].map((tab) => {
              const active = sidebarTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id as any)}
                  className={`flex-1 py-2 border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    active 
                      ? "border-neural-cyan text-neural-cyan font-extrabold" 
                      : "border-transparent text-titanium/40 hover:text-titanium/75"
                  }`}
                >
                  <tab.icon size={11} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* File list container */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
            {sidebarTab === "files" && (
              filteredFiles.map((file) => {
                const isActive = activeFile?.path === file.path;
                return (
                  <div
                    key={file.path}
                    onClick={() => {
                      setActiveFile(file);
                      setMiddleTab("chat");
                    }}
                    className={`group px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer border transition-all duration-300 ${
                      isActive 
                        ? "bg-white/5 border-neural-cyan/25 text-neural-cyan" 
                        : "bg-transparent border-transparent text-titanium/60 hover:text-white hover:bg-white/3"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <FileText size={13} className={isActive ? "text-neural-cyan" : "text-titanium/45"} />
                        {isActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-black shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        )}
                      </div>
                      <span className="text-xs font-mono truncate">{file.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-titanium/30 group-hover:block hidden">{file.size}</span>
                  </div>
                );
              })
            )}

            {sidebarTab === "folders" && (
              loc.foldersList.map((folder, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl flex items-center gap-2.5 text-titanium/60 hover:text-white hover:bg-white/3 cursor-pointer transition-all font-sans"
                >
                  <FolderOpen size={13} className="text-electric-blue/70" />
                  <span className="text-xs font-medium">{folder}</span>
                </div>
              ))
            )}

            {sidebarTab === "data" && (
              <div className="p-4 text-center text-[10px] font-mono text-titanium/30 italic">
                No active datasets mapped inside cognitive cache.
              </div>
            )}
          </div>

          {/* Bottom upload box area */}
          <div className="p-3 border-t border-white/5 bg-black/20">
            <div 
              onClick={handleUploadClick}
              className="border border-dashed border-white/10 hover:border-neural-cyan/30 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] transition-all group"
            >
              <Upload size={18} className="text-titanium/40 group-hover:text-neural-cyan mb-1.5 transition-colors" />
              <span className="text-[10px] font-medium text-titanium/60 group-hover:text-white leading-snug">{loc.dragDrop}</span>
              <input 
                ref={fileInputRef} 
                type="file" 
                onChange={handleFileUploaded} 
                className="hidden" 
              />
            </div>
            
            {/* Storage Progress slider */}
            <div className="mt-3 px-1">
              <div className="flex justify-between items-center text-[9px] font-mono text-titanium/40 mb-1">
                <span>{loc.mbUsed}</span>
                <span>12.4%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-neural-cyan to-electric-blue w-[12.4%]" />
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: MIDDLE CHAT / WORKSPACE CORE MODULE (lg:col-span-5) */}
        {/* ========================================================= */}
        <div className="col-span-1 lg:col-span-5 flex flex-col bg-black/25 border border-white/10 rounded-2xl h-full overflow-hidden backdrop-blur-xl">
          
          {/* Header Row: Agent Info, invite, tokens */}
          <div className="p-4 border-b border-white/10 bg-white/[0.01] flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
            
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono tracking-widest text-neural-cyan uppercase">SOLANA VESTING PROJECT</span>
                <span className="text-[9px] font-mono bg-neural-cyan/15 border border-neural-cyan/20 text-neural-cyan px-1.5 py-0.2 rounded uppercase">ACTIVE</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-mono text-titanium/50">{loc.contextTokens} 12.4%</span>
                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-neural-cyan w-[12.4%]" />
                </div>
              </div>
            </div>

            {/* Active agent circles */}
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {[
                  { name: "Code", color: "bg-emerald-400" },
                  { name: "Research", color: "bg-sky-400" },
                  { name: "Security", color: "bg-purple-400" },
                  { name: "Judge", color: "bg-amber-400" }
                ].map((ag, idx) => (
                  <div 
                    key={idx} 
                    className={`w-6 h-6 rounded-full ${ag.color} border border-black text-[9px] text-black font-extrabold flex items-center justify-center -ml-1.5 shadow-md`}
                    title={ag.name + " Agent"}
                  >
                    {ag.name[0]}
                  </div>
                ))}
                <div className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] text-titanium/60 flex items-center justify-center -ml-1.5 cursor-pointer shadow-md">
                  +2
                </div>
              </div>

              {/* Invitation & action buttons */}
              <button className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-white/90 border border-white/5 rounded-xl transition-all cursor-pointer flex items-center gap-1">
                <UserPlus size={11} />
                <span>{loc.inviteAgent}</span>
              </button>
              
              <button className="px-2.5 py-1.5 bg-neural-cyan text-black hover:bg-white text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1">
                <span>{loc.newTask}</span>
                <ChevronDown size={11} />
              </button>
            </div>

          </div>

          {/* Navigation Tabs bar inside Middle Column */}
          <div className="px-4 bg-white/[0.01] border-b border-white/5 flex gap-1 select-none text-xs">
            {[
              { id: "chat", label: loc.chat, icon: MessageSquare },
              { id: "code", label: loc.code, icon: Code },
              { id: "artifacts", label: loc.artifacts, icon: FileCode },
              { id: "research", label: loc.webSearch, icon: Globe },
              { id: "settings", label: loc.settings, icon: Settings }
            ].map((tab) => {
              const active = middleTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMiddleTab(tab.id as any)}
                  className={`py-3.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer font-sans ${
                    active 
                      ? "border-neural-cyan text-neural-cyan font-bold" 
                      : "border-transparent text-titanium/40 hover:text-titanium/75"
                  }`}
                >
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content screens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* 1. CHAT MODULE CONTENT */}
            {middleTab === "chat" && (
              <div className="flex flex-col h-full justify-between">
                
                {/* Scrollable messages area */}
                <div className="flex-1 space-y-4 overflow-y-auto mb-4 select-text">
                  
                  {/* Default / Simulated Solana message loop when no custom message exists */}
                  {messages.length === 0 ? (
                    <div className="space-y-4">
                      {/* Simulated User message */}
                      <div className="flex flex-col items-end w-full">
                        <div className="flex items-center gap-2 mb-1 px-1 text-[9px] font-mono text-titanium/40">
                          <span>{loc.you}</span>
                          <span>10:28 AM</span>
                        </div>
                        <div className="p-3.5 rounded-2xl text-xs md:text-sm font-sans bg-white/5 text-white border border-white/10 rounded-tr-none max-w-[85%] text-left">
                          {loc.userMsgText}
                        </div>
                      </div>

                      {/* Simulated Agent message */}
                      <div className="flex flex-col items-start w-full animate-fadeIn">
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-md uppercase border border-emerald-400/10">
                            {loc.codeAgent}
                          </span>
                          <span className="text-[9px] font-mono text-titanium/40">10:29 AM</span>
                        </div>
                        
                        <div className="p-3.5 rounded-2xl text-xs md:text-sm font-sans bg-[#111111]/70 text-titanium/90 border border-white/5 rounded-tl-none max-w-[85%] text-left space-y-3">
                          <p>{loc.agentMsgText}</p>
                          
                          {/* Created Files Nested card */}
                          <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCode size={16} className="text-neural-cyan" />
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-mono text-titanium/40">{loc.createdFiles}</span>
                                <span className="text-xs font-mono text-white/90">vesting_program.rs, instructions.rs</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Anchor Program</span>
                          </div>

                          {/* Key features checklist */}
                          <div className="space-y-1.5 text-left pt-1">
                            <span className="text-[10px] font-mono tracking-wide text-neural-cyan block uppercase">{loc.keyFeatures}:</span>
                            <ul className="space-y-1 text-xs text-titanium/75 font-sans">
                              <li className="flex items-center gap-2">
                                <Check size={12} className="text-emerald-400" />
                                <span>{loc.cliff}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check size={12} className="text-emerald-400" />
                                <span>{loc.linear}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check size={12} className="text-emerald-400" />
                                <span>{loc.withdraw}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check size={12} className="text-emerald-400" />
                                <span>{loc.admin}</span>
                              </li>
                            </ul>
                          </div>

                          <p className="border-t border-white/5 pt-2 text-titanium/70">{loc.question}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Real dynamically stored messages
                    messages.map((msg) => {
                      const isUser = msg.sender === "user";
                      return (
                        <div 
                          key={msg.id}
                          className={`flex gap-3 ${isUser ? "ml-auto flex-row-reverse text-right w-fit max-w-[65%]" : "text-left w-full max-w-[80%]"}`}
                        >
                          {/* AI profile avatar is our animated/pulsing circle instead of standard Bot profile */}
                          {isUser ? (
                            <div className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center bg-white/5 shrink-0 text-xs text-titanium/40 mt-1">
                              <User size={12} />
                            </div>
                          ) : (
                            <div className="mt-1">
                              <AnimatedCircleAvatar />
                            </div>
                          )}

                          <div className="flex-1 flex flex-col">
                            <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : "justify-start"}`}>
                              {!isUser && (
                                <span className="text-[9px] font-mono text-neural-cyan bg-neural-cyan/15 px-2 py-0.5 rounded-md uppercase border border-neural-cyan/10">
                                  {msg.agentName || loc.codeAgent}
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-titanium/40">{msg.timestamp}</span>
                            </div>
                            
                            <div className={`p-3.5 rounded-2xl text-xs md:text-sm font-sans leading-relaxed border ${
                              isUser
                                ? "bg-white/5 text-white border-white/10 rounded-tr-none w-fit max-w-full break-words"
                                : "bg-[#111111]/70 text-titanium/90 border-white/5 rounded-tl-none whitespace-pre-line text-left"
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                </div>

                {/* Suggestion Quick Pills */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none py-1 select-none">
                  {[loc.suggest1, loc.suggest2, loc.suggest3, loc.suggestMore].map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(sug === "..." ? "" : language === "fa" ? `لطفاً کد مربوط به ${sug} را بررسی و اصلاح کن` : `Please help me ${sug.toLowerCase()}`)}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] text-titanium/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {/* Premium Embedded Chat input */}
                <form onSubmit={handleSendMessage} className="bg-black/45 border border-white/10 rounded-2xl p-2 relative flex flex-col gap-2">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={loc.askAnything}
                    className="w-full bg-transparent px-3 pt-2 text-xs md:text-sm text-white placeholder-titanium/30 focus:outline-none resize-none font-sans min-h-[50px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  {/* Inside input action bar */}
                  <div className="flex justify-between items-center px-1.5 border-t border-white/5 pt-2 select-none">
                    
                    {/* Left Actions */}
                    <div className="flex items-center gap-1.5 text-titanium/45">
                      <button type="button" className="w-7 h-7 rounded-lg hover:bg-white/5 hover:text-white flex items-center justify-center transition-all cursor-pointer">
                        <Plus size={14} />
                      </button>
                      <button type="button" className="w-7 h-7 rounded-lg hover:bg-white/5 hover:text-white flex items-center justify-center transition-all cursor-pointer">
                        <Globe size={13} />
                      </button>
                      <button type="button" className="w-7 h-7 rounded-lg hover:bg-white/5 hover:text-white flex items-center justify-center transition-all cursor-pointer">
                        <Paperclip size={13} />
                      </button>
                      
                      {/* Model selector select */}
                      <div className="ml-1.5 relative shrink-0">
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-semibold text-titanium/70 px-2 py-1 focus:outline-none cursor-pointer hover:bg-white/10 hover:text-white transition-all appearance-none pr-5 font-sans"
                        >
                          <option value="GPT-4o">GPT-4o</option>
                          <option value="Gemini-1.5">Gemini 1.5</option>
                          <option value="Claude-3.5">Claude 3.5</option>
                        </select>
                        <ChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-titanium/40" />
                      </div>
                    </div>

                    {/* Right Actions - Send Button */}
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="w-8 h-8 rounded-lg bg-neural-cyan hover:bg-white text-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_15px_rgba(93,247,255,0.3)]"
                    >
                      <Send size={13} />
                    </button>

                  </div>
                </form>

                {/* Agent Badges active tags */}
                <div className="mt-3.5 pt-3.5 border-t border-white/5 flex flex-wrap gap-2 items-center select-none">
                  {[
                    { id: "code", label: loc.codeAgent, color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 animate-pulse" },
                    { id: "research", label: loc.researchAgent, color: "border-sky-500/30 text-sky-400 bg-sky-500/5" },
                    { id: "security", label: loc.securityAgent, color: "border-purple-500/30 text-purple-400 bg-purple-500/5" },
                    { id: "judge", label: loc.judgeAgent, color: "border-amber-500/30 text-amber-400 bg-amber-500/5" }
                  ].map((ag) => (
                    <div 
                      key={ag.id} 
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 ${ag.color}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{ag.label}</span>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* 2. FULL CODE SCREEN */}
            {middleTab === "code" && (
              <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-emerald-400 h-full overflow-y-auto select-text">
                <div className="pb-2 border-b border-white/5 flex justify-between items-center mb-3">
                  <span className="text-titanium/40 font-mono">CODE_VIEW_STREAM</span>
                  <span className="text-neural-cyan font-mono">{activeFile?.name || "vesting_program.rs"}</span>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-left">{fileContent || loc.placeholderCode}</pre>
              </div>
            )}

            {/* 3. ARTIFACTS SCREEN */}
            {middleTab === "artifacts" && (
              <div className="space-y-3">
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-left">
                  <span className="text-xs font-semibold text-white/90">{language === "fa" ? "مدیر دارایی‌ها و کدهای سنتز شده" : "Synthesis Assets & Code Manager"}</span>
                  <p className="text-[11px] text-titanium/50 font-mono mt-0.5">Explore machine-ready codebases built by your agents.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {files.map((file) => (
                    <div 
                      key={file.path} 
                      className="p-3.5 bg-black/40 border border-white/5 rounded-xl flex flex-col justify-between items-start gap-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="text-neural-cyan" size={15} />
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-white/90">{file.name}</span>
                          <span className="text-[9px] font-mono text-titanium/40">{file.size} • {file.type.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full pt-1">
                        <button 
                          onClick={() => {
                            setActiveFile(file);
                            setMiddleTab("chat");
                          }}
                          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-titanium hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer"
                        >
                          View Code
                        </button>
                        <button className="py-1.5 px-2 bg-neural-cyan/10 hover:bg-neural-cyan text-neural-cyan hover:text-black rounded-lg transition-all cursor-pointer">
                          <Download size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. WEB RESEARCH SEARCH MODULE */}
            {middleTab === "research" && (
              <div className="space-y-4 text-left">
                <div className="p-4 bg-[#111111]/60 border border-white/5 rounded-xl">
                  <span className="text-xs font-mono tracking-widest text-neural-cyan block mb-2 uppercase">DEEP COGNITIVE CRAWLER</span>
                  <form onSubmit={handleResearchSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={webQuery}
                      onChange={(e) => setWebQuery(e.target.value)}
                      placeholder={t.researchPlaceholder}
                      className="flex-1 bg-[#161616]/75 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-titanium/30 focus:outline-none focus:border-neural-cyan/35 transition-colors font-sans"
                    />
                    <button
                      type="submit"
                      className="bg-neural-cyan hover:bg-white text-black px-4 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Search size={12} />
                      <span>Search</span>
                    </button>
                  </form>
                </div>

                <div className="space-y-4">
                  {researchLogs.map((log, idx) => (
                    <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white/95">
                          Query: &quot;{log.query}&quot;
                        </h4>
                        <span className="text-[9px] font-mono text-neural-cyan bg-neural-cyan/10 px-2 py-0.5 rounded">
                          COMPLETED
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[9px] font-mono tracking-wider text-neural-cyan uppercase">EXTRACTED CITATIONS:</div>
                        <div className="space-y-1">
                          {log.citations.map((cite, cIdx) => (
                            <a 
                              href="#citations" 
                              key={cIdx} 
                              className="flex items-center gap-1.5 text-xs text-titanium/50 hover:text-neural-cyan transition-colors"
                            >
                              <ExternalLink size={9} />
                              <span className="underline truncate">{cite}</span>
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="text-[9px] font-mono tracking-wider text-neural-cyan uppercase">INTELLIGENT SUMMARY:</div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-titanium/75">
                          {log.findings.map((finding, fIdx) => (
                            <li key={fIdx}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. SETTINGS MODULE */}
            {middleTab === "settings" && (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4 text-left">
                <div>
                  <h4 className="text-xs font-mono font-bold text-neural-cyan uppercase">SANDBOX ENGINE PREFERENCES</h4>
                  <p className="text-[11px] text-titanium/40 mt-1">Configure compilation parameters and container environments.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2.5 bg-black/40 border border-white/5 rounded-lg text-xs">
                    <span className="text-white/80 font-medium">Automatic checked math overflows</span>
                    <div className="w-8 h-4 bg-neural-cyan rounded-full p-0.5 flex justify-end items-center cursor-pointer">
                      <div className="w-3 h-3 bg-black rounded-full" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-black/40 border border-white/5 rounded-lg text-xs">
                    <span className="text-white/80 font-medium">Verbose compilation reports</span>
                    <div className="w-8 h-4 bg-neural-cyan rounded-full p-0.5 flex justify-end items-center cursor-pointer">
                      <div className="w-3 h-3 bg-black rounded-full" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-black/40 border border-white/5 rounded-lg text-xs">
                    <span className="text-white/80 font-medium">Direct Solana anchor deployment</span>
                    <div className="w-8 h-4 bg-white/10 rounded-full p-0.5 flex justify-start items-center cursor-pointer">
                      <div className="w-3 h-3 bg-titanium/40 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: RIGHT INTERACTIVE CODE EDITOR & CONSOLE (lg:col-span-4) */}
        {/* ========================================================= */}
        <div className="hidden lg:flex lg:col-span-4 flex-col bg-black/35 border border-white/10 rounded-2xl h-full overflow-hidden backdrop-blur-xl">
          
          {/* Editor Header: File tabs select */}
          <div className="p-3 bg-white/[0.01] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap pr-2">
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-neural-cyan border border-white/10 rounded-lg text-[10px] font-mono shrink-0 select-none"
              >
                <FileText size={11} />
                <span>{activeFile?.name || "vesting_program.rs"}</span>
                <X size={10} className="ml-1 text-titanium/50 hover:text-white" />
              </button>

              <button className="w-6 h-6 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-titanium/40 border border-white/5 cursor-pointer shrink-0">
                <Plus size={11} />
              </button>
            </div>

            {/* Language dropdown rust select */}
            <div className="relative shrink-0">
              <select
                className="bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-[10px] font-mono text-titanium/70 px-2.5 py-1.5 focus:outline-none cursor-pointer appearance-none pr-5"
                defaultValue="Rust"
              >
                <option value="Rust">{loc.rust}</option>
                <option value="TypeScript">TypeScript</option>
                <option value="JSON">JSON</option>
                <option value="Cargo">Cargo</option>
              </select>
              <ChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-titanium/40" />
            </div>
          </div>

          {/* Code text editor viewport */}
          <div className="flex-1 flex bg-black/15 relative overflow-hidden">
            
            {/* Simulation of code lines count on left margin */}
            <div className="py-5 px-3 bg-black/15 border-r border-white/5 font-mono text-[10px] text-titanium/35 text-right select-none select-none min-w-[32px] overflow-hidden leading-relaxed">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {activeFile ? (
              <textarea
                value={fileContent}
                onChange={(e) => handleFileChange(e.target.value)}
                className="flex-1 w-full bg-transparent p-5 font-mono text-[11px] md:text-xs text-emerald-400/90 leading-relaxed focus:outline-none resize-none border-none select-text selection:bg-neural-cyan/35 selection:text-white"
                style={{ tabSize: 4 }}
                placeholder="// Start writing machine-ready instructions..."
              />
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8 select-none">
                <Code size={36} className="text-titanium/20 mb-3 animate-pulse" />
                <p className="text-xs text-titanium/40 max-w-[200px]">{loc.noFileSelected}</p>
              </div>
            )}

            {/* Glowing brand watermark */}
            <div className="absolute bottom-4 right-4 pointer-events-none opacity-5 font-display text-2xl font-bold text-white tracking-widest">
              MIMO KERNEL
            </div>
          </div>

          {/* Console / Terminal Section (h-48 split layout) */}
          <div className="h-48 border-t border-white/10 bg-black/85 flex flex-col overflow-hidden">
            
            {/* Terminal Tab Header */}
            <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-[10px] font-mono bg-black/40">
              <div className="flex gap-2">
                {[
                  { id: "console", label: loc.console },
                  { id: "tests", label: loc.tests },
                  { id: "sim", label: loc.simulation },
                  { id: "deploy", label: loc.deployments }
                ].map((tb) => (
                  <span 
                    key={tb.id} 
                    className={`font-mono cursor-pointer ${tb.id === "console" ? "text-neural-cyan font-bold" : "text-titanium/45 hover:text-titanium/70"}`}
                  >
                    {tb.label}
                  </span>
                ))}
              </div>

              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                ONLINE
              </span>
            </div>

            {/* Compile log stream */}
            <div className="flex-1 p-3.5 font-mono text-[10px] space-y-1 overflow-y-auto text-left select-text scrollbar-thin">
              {compilationLogs.map((log, lIdx) => (
                <div 
                  key={lIdx} 
                  className={
                    log.includes("✓") || log.includes("success") || log.includes("Success") ? "text-emerald-400" :
                    log.includes("[SYSTEM_INIT]") || log.includes("[COMPILING]") ? "text-neural-cyan" :
                    log.includes("[AST]") ? "text-amber-400" :
                    log.includes("[OPTIMIZER]") || log.includes("[RUN]") ? "text-purple-400" : "text-titanium/55"
                  }
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Bottom simulation clear row bar */}
            <div className="p-2 border-t border-white/5 bg-black/30 flex items-center justify-between">
              <button 
                onClick={runCodeCompilation}
                disabled={isCompiling}
                className="h-7 px-3.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black font-semibold text-[10px] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)] disabled:opacity-40"
              >
                <Play size={10} />
                <span>{isCompiling ? "Running..." : loc.runSimulation}</span>
              </button>

              <button 
                onClick={() => setCompilationLogs([])}
                className="w-7 h-7 hover:bg-white/5 rounded-lg flex items-center justify-center text-titanium/40 hover:text-white transition-colors cursor-pointer"
                title="Clear logs"
              >
                <Trash2 size={12} />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Elegant Modal Backdrop for Creating New File */}
      <AnimatePresence>
        {showNewFileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.form
              onSubmit={createNewFile}
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-obsidian border border-neural-cyan/35 p-6 rounded-2xl shadow-[0_0_40px_rgba(93,247,255,0.2)] flex flex-col gap-4 relative"
            >
              <button 
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="absolute top-4 right-4 text-titanium/40 hover:text-white"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
                  <Plus size={16} className="text-neural-cyan" />
                  {language === "fa" ? "ایجاد فایل جدید دایرکتوری" : "Create New File Asset"}
                </h3>
                <p className="text-[11px] text-titanium/50 font-mono mt-1">
                  {language === "fa" ? "نام فایل را به همراه پسوند وارد کنید (مانند: instructions.rs)" : "Enter file name with extension (e.g. instructions.rs)"}
                </p>
              </div>

              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={language === "fa" ? "مثال: instructions.rs" : "e.g. instructions.rs"}
                className="w-full bg-[#161616]/85 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-titanium/30 focus:outline-none focus:border-neural-cyan/35 transition-all font-mono"
              />

              <div className="flex items-center gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewFileName("");
                    setShowNewFileModal(false);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-white/5 bg-white/3 hover:bg-white/10 text-[11px] text-titanium hover:text-white transition-all cursor-pointer font-sans"
                >
                  {language === "fa" ? "انصراف" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!newFileName.trim()}
                  className="px-4 py-2 rounded-xl bg-neural-cyan text-black font-semibold text-[11px] hover:bg-white transition-all cursor-pointer disabled:opacity-40"
                >
                  {language === "fa" ? "ایجاد فایل" : "Create File"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
