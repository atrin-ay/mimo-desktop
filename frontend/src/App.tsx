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
import HomeScreen from "./components/HomeScreen";
import Workspace from "./components/Workspace";
import MemorySystem from "./components/MemorySystem";
import DashboardSection from "./components/DashboardSection";
import ProjectsSection from "./components/ProjectsSection";
import AutomationsSection from "./components/AutomationsSection";
import IntegrationsSection from "./components/IntegrationsSection";
import SettingsSection from "./components/SettingsSection";

import { 
  Compass, 
  Target, 
  Users, 
  Database, 
  Cpu, 
  Terminal, 
  Star, 
  Home, 
  ArrowRight, 
  Menu, 
  X,
  Bell,
  Clock,
  User,
  Power,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  Briefcase,
  Bot,
  Zap,
  Brain,
  Plug,
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

  // Initial Mock Files
  const [files, setFiles] = useState<FileItem[]>([
    {
      name: "vesting_program.rs",
      type: "code",
      size: "2.4 KB",
      path: "/src/contracts/vesting_program.rs",
      content: `use anchor_lang::prelude::*;\n\ndeclare_id!("Vvest11111111111111111111111111111111111111");\n\n#[program]\npub mod vesting_program {\n    use super::*;\n\n    pub fn initialize_vesting_cliff(\n        ctx: Context<InitializeVesting>,\n        cliff_time: i64,\n        vesting_rate: u64,\n    ) -> Result<()> {\n        let state = &mut ctx.accounts.vesting_state;\n        state.cliff_timestamp = cliff_time;\n        state.tokens_per_second = vesting_rate;\n        state.start_time = Clock::get()?.unix_timestamp;\n        Ok(())\n    }\n\n    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {\n        let state = &mut ctx.accounts.vesting_state;\n        let now = Clock::get()?.unix_timestamp;\n        require!(now >= state.cliff_timestamp, VestingError::CliffNotReached);\n        \n        let elapsed = now - state.start_time;\n        let withdrawable = (elapsed as u64) * state.tokens_per_second;\n        \n        state.total_withdrawn += withdrawable;\n        Ok(())\n    }\n}\n\n#[derive(Accounts)]\npub struct InitializeVesting<'info> {\n    #[account(init, payer = user, space = 8 + 64)]\n    pub vesting_state: Account<'info, VestingState>,\n    #[account(mut)]\n    pub user: Signer<'info>,\n    pub system_program: Program<'info, System>,\n}\n\n#[derive(Accounts)]\npub struct Withdraw<'info> {\n    #[account(mut)]\n    pub vesting_state: Account<'info, VestingState>,\n    #[account(mut)]\n    pub beneficiary: Signer<'info>,\n}\n\n#[account]\npub struct VestingState {\n    pub cliff_timestamp: i64,\n    pub start_time: i64,\n    pub tokens_per_second: u64,\n    pub total_withdrawn: u64,\n}\n\n#[error_code]\npub enum VestingError {\n    #[msg("Vesting cliff timestamp has not been reached yet.")]\n    CliffNotReached,\n}`
    },
    {
      name: "lib.rs",
      type: "code",
      size: "0.8 KB",
      path: "/src/contracts/lib.rs",
      content: `pub mod instructions;\npub mod state;\n\nuse anchor_lang::prelude::*;\n\ndeclare_id!("Vvest11111111111111111111111111111111111111");\n\n#[program]\npub mod vesting_program {\n    use super::*;\n}`
    },
    {
      name: "instructions.rs",
      type: "code",
      size: "1.2 KB",
      path: "/src/contracts/instructions.rs",
      content: `use anchor_lang::prelude::*;\nuse crate::state::*;\n\npub fn initialize_vesting_cliff(\n    ctx: Context<InitializeVesting>,\n    cliff_time: i64,\n    vesting_rate: u64,\n) -> Result<()> {\n    let state = &mut ctx.accounts.vesting_state;\n    state.cliff_timestamp = cliff_time;\n    state.tokens_per_second = vesting_rate;\n    state.start_time = Clock::get()?.unix_timestamp;\n    Ok(())\n}`
    },
    {
      name: "state.rs",
      type: "code",
      size: "0.5 KB",
      path: "/src/contracts/state.rs",
      content: `use anchor_lang::prelude::*;\n\n#[account]\npub struct VestingState {\n    pub cliff_timestamp: i64,\n    pub start_time: i64,\n    pub tokens_per_second: u64,\n    pub total_withdrawn: u64,\n}`
    },
    {
      name: "Cargo.toml",
      type: "code",
      size: "0.4 KB",
      path: "/Cargo.toml",
      content: `[package]\nname = "vesting-program"\nversion = "0.1.0"\ndescription = "Solana Vesting Program with Cliff"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"`
    },
    {
      name: "Anchor.toml",
      type: "code",
      size: "0.6 KB",
      path: "/Anchor.toml",
      content: `[features]\nseeds = false\nskip-lint = false\n\n[programs.localnet]\nvesting_program = "Vvest11111111111111111111111111111111111111"\n\n[registry]\nurl = "https://api.apr.dev"\n\n[provider]\ncluster = "Localnet"\nwallet = "~/.config/solana/id.json"`
    },
    {
      name: "README.md",
      type: "document",
      size: "1.5 KB",
      path: "/README.md",
      content: `# Solana Vesting Program\n\nThis program facilitates token vesting on Solana using the Anchor framework.\nIt supports:\n- 6-month cliff release\n- Linear unlocks over 24 months`
    },
    {
      name: "test_vesting.ts",
      type: "code",
      size: "1.1 KB",
      path: "/tests/test_vesting.ts",
      content: `import * as anchor from "@coral-xyz/anchor";\nimport { Program } from "@coral-xyz/anchor";\nimport { VestingProgram } from "../target/types/vesting_program";\n\ndescribe("vesting_program", () => {\n  anchor.setProvider(anchor.AnchorProvider.env());\n  const program = anchor.workspace.VestingProgram as Program<VestingProgram>;\n\n  it("Is initialized!", async () => {\n    // test initialization\n  });\n});`
    },
    {
      name: "deploy.ts",
      type: "code",
      size: "0.8 KB",
      path: "/scripts/deploy.ts",
      content: `import { Connection, Keypair } from "@solana/web3.js";\n// Deploy logic for local cluster node\nconsole.log("Initiating Anchor deployment cluster...");`
    }
  ]);

  // Subjects / Conversations state (houses all messages per subject)
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: "1",
      name: "Consolidated Micro-Frontend Architecture",
      date: "6 mins ago",
      dateFa: "۶ دقیقه پیش",
      status: "Active",
      category: "projects",
      messages: [
        {
          id: "1",
          sender: "system",
          text: "MIMO Operating System initialized cleanly inside secure isolated local Sandbox core.",
          timestamp: "10:05:46"
        },
        {
          id: "2",
          sender: "agent",
          agentName: "Scribe-Context",
          text: "Continuous neural indexing has completed. Extracted 4 parallel software pipelines matching recent session parameters.",
          timestamp: "10:05:52",
          tokensPerSec: 1950
        }
      ]
    },
    {
      id: "2",
      name: "Solana Deflationary Tokenomics Vesting",
      date: "2 hours ago",
      dateFa: "۲ ساعت پیش",
      status: "Completed",
      category: "projects",
      messages: [
        {
          id: "sys-2",
          sender: "system",
          text: "Solana runtime environment loaded. Ready to deploy program.",
          timestamp: "08:12:00"
        },
        {
          id: "agent-2",
          sender: "agent",
          agentName: "Scribe-Context",
          text: "Security baseline established. Awaiting Anchor program details.",
          timestamp: "08:12:30",
          tokensPerSec: 1720
        }
      ]
    },
    {
      id: "3",
      name: "Zero-Knowledge Rollup proofing",
      date: "Yesterday",
      dateFa: "دیروز",
      status: "Saved",
      category: "projects",
      messages: []
    },
    {
      id: "4",
      name: "Personal Productivity & Cognitive Focus",
      date: "3 mins ago",
      dateFa: "۳ دقیقه پیش",
      status: "Active",
      category: "personal",
      messages: [
        {
          id: "sys-4",
          sender: "system",
          text: "Personal alignment matrix loaded. System performance is running in high priority mode.",
          timestamp: "10:15:00"
        },
        {
          id: "agent-4",
          sender: "agent",
          agentName: "Cipher-9",
          text: "Hi Armin. Ready to sync your personal development goals and daily cognitive logs. How can I assist you today?",
          timestamp: "10:15:30",
          tokensPerSec: 1890
        }
      ]
    },
    {
      id: "5",
      name: "Healthy Habits & Meditation Planner",
      date: "2 days ago",
      dateFa: "۲ روز پیش",
      status: "Saved",
      category: "personal",
      messages: []
    }
  ]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("1");
  const [recentPanelOpen, setRecentPanelOpen] = useState<boolean>(true);
  const [assistantDropdownOpen, setAssistantDropdownOpen] = useState<boolean>(true);
  
  const [projects, setProjects] = useState<any[]>([
    {
      id: "proj-1",
      name: "Startup Research",
      date: "6 mins ago",
      dateFa: "۶ دقیقه پیش",
      documents: [
        { name: "market_analysis_2026.pdf", type: "pdf", size: "2.4 MB" },
        { name: "competitor_matrix.xlsx", type: "spreadsheet", size: "1.1 MB" },
        { name: "gtm_pitch.docx", type: "document", size: "850 KB" }
      ],
      conversations: [
        {
          id: "c-1",
          name: "Market Analysis",
          messages: [
            { id: "m-1", sender: "user", text: "Analyze our initial addressable market size.", timestamp: "10:10:00" },
            { id: "m-2", sender: "agent", text: "Based on the uploaded market_analysis_2026.pdf, your Total Addressable Market (TAM) is estimated at $14.2B with a CAGR of 12.4%.", timestamp: "10:10:15" }
          ]
        },
        {
          id: "c-2",
          name: "Competitor Analysis",
          messages: [
            { id: "m-3", sender: "user", text: "Who are our primary competitors in security?", timestamp: "10:12:00" },
            { id: "m-4", sender: "agent", text: "Analyzing competitor_matrix.xlsx, the main competitors are Sentinel-X and SafeLoop, with Sentinel-X leading in market share but lacking automated auditing.", timestamp: "10:12:20" }
          ]
        },
        { id: "c-3", name: "Financial Review", messages: [] },
        { id: "c-4", name: "GTM Strategy", messages: [] }
      ]
    },
    {
      id: "proj-2",
      name: "University Materials & Cognitive Sci",
      date: "2 hours ago",
      dateFa: "۲ ساعت پیش",
      documents: [
        { name: "cognitive_science_overview.pdf", type: "pdf", size: "5.1 MB" },
        { name: "neural_correlates_data.csv", type: "csv", size: "1.2 MB" }
      ],
      conversations: [
        { id: "c-5", name: "Literature Review", messages: [] },
        { id: "c-6", name: "Methodology Design", messages: [] }
      ]
    }
  ]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

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

  // Initial Mock Goals
  const [activeGoals, setActiveGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Consolidated Micro-Frontend Architecture",
      description: "Design and bundle an automated low-latency micro-frontend environment supporting real-time WebSockets, Web Worker compilers and sandbox execution directories.",
      status: "active",
      progress: 0.65,
      confidence: 0.98,
      judgeValidation: "[JUDGE_PASS] All 14 security sandboxing rules and context leakage tests verified. Code compiled safely."
    },
    {
      id: "2",
      title: "Solana Deflationary Tokenomics Vesting Wrapper",
      description: "Draft highly protective Anchor programs containing mathematical cliff-aligned vesting schedules. Run extensive gas optimization reviews.",
      status: "active",
      progress: 0.28,
      confidence: 0.94,
      judgeValidation: "[JUDGE_PENDING] Critical testing coverage is at 45%. Awaiting mathematical overflow verification from Cipher-9."
    }
  ]);

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
  const handleExecuteCommand = (cmd: string) => {
    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: cmd,
      timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setOrbState(OrbState.Thinking);
    triggerNotification(language === "fa" ? "در حال ارسال توکن پردازشی..." : "Injecting pipeline token...");

    // Stage 1: Thinking response
    setTimeout(() => {
      setOrbState(OrbState.Researching);
      triggerNotification(language === "fa" ? "در حال کاوش در مراجع خارجی..." : "Researching external repositories...");
    }, 1200);

    // Stage 2: Executing response (creating mock code files or tasks)
    setTimeout(() => {
      setOrbState(OrbState.Executing);
      triggerNotification(language === "fa" ? "در حال اجرای حلقه‌های کامپایل مستقل..." : "Autonomous compile loops running...");
      
      const newFile: FileItem = {
        name: "vesting_program.rs",
        type: "code",
        size: "1.9 KB",
        path: "/src/contracts/vesting_program.rs",
        content: `// Anchor-based Solana vesting program synthesized automatically by Cipher-9\nuse anchor_lang::prelude::*;\n\ndeclare_id!("Vvest11111111111111111111111111111111111111");\n\n#[program]\npub mod vesting_program {\n    use super::*;\n\n    pub fn initialize_vesting_cliff(\n        ctx: Context<InitializeVest>,\n        cliff_time: i64,\n        vesting_rate: u64\n    ) -> Result<()> {\n        let state = &mut ctx.accounts.vesting_state;\n        state.cliff_timestamp = cliff_time;\n        state.tokens_per_second = vesting_rate;\n        Ok(())\n    }\n}`
      };

      setFiles(prev => [newFile, ...prev]);
    }, 2800);

    // Stage 3: Completed Response
    setTimeout(() => {
      setOrbState(OrbState.Completed);
      triggerNotification(language === "fa" ? "مأموریت شناختی با موفقیت به پایان رسید." : "Autonomous goal completed successfully.");

      let textResponse = "";
      if (language === "fa") {
        if (interactionMode === InteractionMode.Direct) {
          textResponse = `توافق شناختی بر روی دستور شما حاصل شد: "${cmd}". فایل جدید 'vesting_program.rs' در فضای کاری ایجاد شد. تمامی ممیزی‌های ریاضیاتی و بررسی‌های سرریز عددی توسط ناظر سیستم تأیید و در سندباکس ایمن بارگذاری گردید.`;
        } else if (interactionMode === InteractionMode.Plan) {
          textResponse = `برنامه راهبردی گام‌به‌گام برای تحقق "${cmd}" با موفقیت تدوین شد:\n\n۱. [✓] تحلیل ساختار قرارداد هوشمند و نیازمندی‌ها\n۲. [✓] نگاشت فایل ساختاری 'vesting_program.rs'\n۳. [ ] بهینه‌سازی محاسباتی مصرف سوخت (Gas Optimization)\n۴. [ ] انجام سناریوهای حمله دابل اسپندینگ در سندباکس`;
        } else {
          textResponse = `عملیات عصبی به عامل‌های خودگردان محول شد:\n- **سایفر-۹** فایل 'vesting_program.rs' را با موفقیت سنتز کرد.\n- **سنتری-۹** ایزوله‌سازی امن حافظه و تطبیق مجوزها را تأیید نمود.\n- **معمار هوش مصنوعی** الگوی ساختاری نهایی را با موفقیت پیاده کرد.`;
        }
      } else {
        if (interactionMode === InteractionMode.Direct) {
          textResponse = `Consensus reached on cognitive goal: "${cmd}". Created file 'vesting_program.rs' inside workspace. Anchor compilation checks and standard re-entrancy mathematical locks have been fully applied and verified by the Judge.`;
        } else if (interactionMode === InteractionMode.Plan) {
          textResponse = `Strategic step-by-step roadmap distilled for task "${cmd}":\n\n1. [✓] Core compilation analysis and Rust module drafting\n2. [✓] Generated 'vesting_program.rs' structure in your filesystem\n3. [ ] Perform advanced security sandboxing tests\n4. [ ] Initiate mathematical lock overflow verification via Cipher-9`;
        } else {
          textResponse = `Autonomous neural delegation completed for: "${cmd}":\n- **Cipher-9** synthesized 'vesting_program.rs' using high confidence weights.\n- **Sentry.v9** verified compilation and memory safety parameters.\n- **Scribe-Context** logged and indexed the newly updated code pathways.`;
        }
      }

      const responseMsg: Message = {
        id: String(Date.now() + 1),
        sender: "agent",
        agentName: language === "fa" ? "سایفر-۹" : "Cipher-9",
        text: textResponse,
        timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        tokensPerSec: 1840
      };

      setMessages(prev => [...prev, responseMsg]);
    }, 4500);

    setTimeout(() => {
      setOrbState(OrbState.Idle);
    }, 7000);
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
    { view: ActiveView.Workspace, label: "Workspace", icon: Terminal },
    { view: ActiveView.Automations, label: "Automations", icon: Zap },
    { view: ActiveView.Memory, label: "Memory", icon: Brain },
    { view: ActiveView.Integrations, label: "Integrations", icon: Plug },
    { view: ActiveView.Settings, label: "Settings", icon: Settings }
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
                    } else if (view === "AssistantProjects") {
                      selectAssistantView(ActiveView.AssistantProjects);
                    } else {
                      setActiveView(view);
                    }
                  }}
                  onNavigateToProject={(projId) => {
                    setSelectedProjectId(projId);
                    selectAssistantView(ActiveView.AssistantProjects);
                  }}
                  onNavigateToChat={(chatId) => {
                    setActiveSubjectId(chatId);
                    selectAssistantView(ActiveView.AssistantPersonal);
                  }}
                  subjects={subjects}
                  projects={projects}
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
                        { id: `auto-res-${Date.now()}`, sender: "agent", agentName: "Planning Agent", text: "Automation pipeline executed successfully. Target sweep completed, compiled logs generated in sandbox.", timestamp: new Date().toLocaleTimeString() }
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
            </motion.div>
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
