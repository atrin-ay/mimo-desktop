export interface TranslationSet {
  systemVersion: string;
  whatAreWeBuilding: string;
  whatAreWeBuildingHighlight: string;
  substrateDesc: string;
  placeholder: string;
  synthesizeBtn: string;
  restoreSessions: string;
  activeModules: string;
  osTelemetry: string;
  recentSecRollup: string;
  recentProjectChronos: string;
  recentAssetOrchestrator: string;
  telemetryCores: string;
  telemetryCoresValue: string;
  telemetryNodes: string;
  telemetryNodesValue: string;
  telemetrySpeed: string;
  telemetrySpeedValue: string;
  telemetrySandbox: string;
  telemetrySandboxValue: string;
  neuroLinkTitle: string;
  neuroLinkDesc: string;
  modeDirect: string;
  modeDirectDesc: string;
  modePlan: string;
  modePlanDesc: string;
  modeAgent: string;
  modeAgentDesc: string;
  restoreLabel: string;
  suggestDeepLearningTag: string;
  suggestDeepLearningTitle: string;
  suggestDeepLearningDesc: string;
  suggestSecOpsTag: string;
  suggestSecOpsTitle: string;
  suggestSecOpsDesc: string;
  suggestAgenticTag: string;
  suggestAgenticTitle: string;
  suggestAgenticDesc: string;
  suggestCoreDevTag: string;
  suggestCoreDevTitle: string;
  suggestCoreDevDesc: string;
  navOrb: string;
  navWorkspace: string;
  navMemory: string;
  navCores: string;
  navMilestones: string;
  navSkills: string;
  navMcp: string;
  workspaceTitle: string;
  workspaceDesc: string;
  tabFeed: string;
  tabArtifacts: string;
  tabResearch: string;
  compileBtn: string;
  compilingStatus: string;
  researchPlaceholder: string;
  workspaceInputPlaceholder: string;
  languageSelect: string;
  homeQuickChat: string;
  viewWorkspaceLink: string;
  cognitiveEngineReady: string;
  recentAndProjects: string;
  newChatBtn: string;
  active: string;
  saved: string;
  completed: string;
  collapse: string;
  expand: string;
  assistant: string;
  personal: string;
  projects: string;
  automations: string;
  integrations: string;
  settings: string;
  memory: string;
  home: string;
}

export const translations: Record<"en" | "fa", TranslationSet> = {
  en: {
    systemVersion: "MIMO OS v4.0.9 (STABLE_RELEASE)",
    whatAreWeBuilding: "What are we ",
    whatAreWeBuildingHighlight: "building",
    substrateDesc: "An autonomous cognitive substrate of agents, tools, and visual synthesis.",
    placeholder: "Inject goal, command, or neural pipeline instruction...",
    synthesizeBtn: "Synthesize",
    restoreSessions: "Restore recent sessions",
    activeModules: "Active Workspace Modules",
    osTelemetry: "OS Telemetry & Core Status",
    recentProjectChronos: "Project Chronos Integration",
    recentSecRollup: "Zero-Knowledge Rollup proofing",
    recentAssetOrchestrator: "Dynamic Asset Orchestrator",
    telemetryCores: "Agent Cores:",
    telemetryCoresValue: "16 Dedicated",
    telemetryNodes: "Memory Nodes:",
    telemetryNodesValue: "4.2 Billion",
    telemetrySpeed: "Cognitive Speed:",
    telemetrySpeedValue: "1.9 K-Tokens/s",
    telemetrySandbox: "Secure Sandboxing:",
    telemetrySandboxValue: "Active",
    neuroLinkTitle: "Neuro-Link Synthesis",
    neuroLinkDesc: "Continuous synaptic alignment is operating at 99.8%. Check compiled memory schemas.",
    modeDirect: "Direct Action",
    modeDirectDesc: "Fast compilation & single command execution",
    modePlan: "Planning Mode",
    modePlanDesc: "Generate multi-step milestones & roadmap",
    modeAgent: "Neural Agent",
    modeAgentDesc: "Deploy team of specialized collaborative agents",
    restoreLabel: "Restore recent sessions",
    suggestDeepLearningTag: "Deep Learning",
    suggestDeepLearningTitle: "Synthesize Neural Network Architecture",
    suggestDeepLearningDesc: "Deploy self-optimizing layers with zero latency",
    suggestSecOpsTag: "SecOps",
    suggestSecOpsTitle: "Audit Smart Contract Integrity",
    suggestSecOpsDesc: "Trace cryptographic flaws & vulnerability vectors",
    suggestAgenticTag: "Agentic Systems",
    suggestAgenticTitle: "Distill Multi-Agent Workflow",
    suggestAgenticDesc: "Assign collaborative roles to optimize production",
    suggestCoreDevTag: "Core Dev",
    suggestCoreDevTitle: "Bootstrap High-Performance Engine",
    suggestCoreDevDesc: "Generate C++ low-latency memory bindings",
    navOrb: "Neural Orb",
    navWorkspace: "Workspace",
    navMemory: "Neuro-Memory",
    navCores: "Autonomous Cores",
    navMilestones: "Milestones",
    navSkills: "Skill Packs",
    navMcp: "MCP Hub",
    workspaceTitle: "Adaptive Cognitive Workspace",
    workspaceDesc: "NODE_ADDR: 0x4FF8...A091 • CONTEXT_TOKEN_LOAD: 12.4% • MULTI_AGENT_HUB: ACTIVE",
    tabFeed: "Command Feed",
    tabArtifacts: "Artifact Explorer",
    tabResearch: "Deep Web Pipeline",
    compileBtn: "Compile Artifact",
    compilingStatus: "Compiling...",
    researchPlaceholder: "Search query to crawl deep web and extract citations...",
    workspaceInputPlaceholder: "Provide prompt or goal execution parameter...",
    languageSelect: "فارسی",
    homeQuickChat: "Synaptic Conversation Feed",
    viewWorkspaceLink: "View in Workspace Mode",
    cognitiveEngineReady: "Cognitive Engine Ready",
    recentAndProjects: "Recent & Projects",
    newChatBtn: "New Chat Channel",
    active: "Active",
    saved: "Saved",
    completed: "Completed",
    collapse: "Collapse Panel",
    expand: "Expand Panel",
    assistant: "Assistant",
    personal: "Personal",
    projects: "Projects",
    automations: "Automations",
    integrations: "Integrations",
    settings: "Settings",
    memory: "Memory",
    home: "Home"
  },
  fa: {
    systemVersion: "سیستم‌عامل میمو نسخه ۴.۰.۹ (نسخه پایدار)",
    whatAreWeBuilding: "امروز چه چیزی را ",
    whatAreWeBuildingHighlight: "خلق می‌کنیم؟",
    substrateDesc: "یک بستر شناختی خودمختار از عامل‌ها، ابزارها و هم‌نهشتی‌های بصری.",
    placeholder: "هدف، دستور یا فرمان خط لوله عصبی را وارد کنید...",
    synthesizeBtn: "سنتز و پردازش",
    restoreSessions: "بازیابی نشست‌های اخیر",
    activeModules: "ماژول‌های فعال فضای کاری",
    osTelemetry: "تله‌متری سیستم‌عامل و وضعیت هسته",
    recentProjectChronos: "ادغام پروژه کرونوس",
    recentSecRollup: "تاییدیه رول‌آپ دانش صفر",
    recentAssetOrchestrator: "هماهنگ‌کننده دارایی‌های پویا",
    telemetryCores: "هسته‌های عامل عصب‌شناختی:",
    telemetryCoresValue: "۱۶ هسته اختصاصی",
    telemetryNodes: "گره‌های حافظه فعال:",
    telemetryNodesValue: "۴.۲ میلیارد گره",
    telemetrySpeed: "سرعت پردازش شناختی:",
    telemetrySpeedValue: "۱.۹ کیلوبایت توکن بر ثانیه",
    telemetrySandbox: "ایزوله‌سازی امن (سندباکس):",
    telemetrySandboxValue: "فعال",
    neuroLinkTitle: "سنتز نورولینک عصبی",
    neuroLinkDesc: "هم‌راستایی مداوم سیناپسی در ۹۹.۸٪ فعال است. طرحواره‌های حافظه کامپایل‌شده را بررسی کنید.",
    modeDirect: "اقدام مستقیم",
    modeDirectDesc: "کامپایل سریع و اجرای دستورات تکی",
    modePlan: "حالت برنامه‌ریزی",
    modePlanDesc: "تولید گام‌به‌گام مایلستون‌ها و نقشه راه",
    modeAgent: "عامل هوشمند عصبی",
    modeAgentDesc: "استقرار تیمی از عامل‌های تخصصی همکار",
    restoreLabel: "بازیابی نشست‌های اخیر",
    suggestDeepLearningTag: "یادگیری عمیق",
    suggestDeepLearningTitle: "سنتز معماری شبکه عصبی",
    suggestDeepLearningDesc: "استقرار لایه‌های خودبهینه‌ساز با تاخیر صفر ثانیه",
    suggestSecOpsTag: "امنیت سایبری",
    suggestSecOpsTitle: "ممیزی جامع قراردادهای هوشمند",
    suggestSecOpsDesc: "ردیابی آسیب‌پذیری‌ها و بردارهای نفوذ رمزنگاری",
    suggestAgenticTag: "سامانه‌های عاملی",
    suggestAgenticTitle: "تطبیق جریان کار چندعاملی",
    suggestAgenticDesc: "انتساب نقش‌های همکارانه برای بهینه‌سازی تولید",
    suggestCoreDevTag: "توسعه هسته",
    suggestCoreDevTitle: "راه‌اندازی موتور پردازش با کارایی بالا",
    suggestCoreDevDesc: "تولید کدهای سی‌پلاس‌پلاس با حافظه نگاشت‌شده فوق‌سریع",
    navOrb: "اورب عصبی",
    navWorkspace: "فضای کاری",
    navMemory: "حافظه عصبی",
    navCores: "هسته‌های مستقل خودمختار",
    navMilestones: "مایلستون‌ها",
    navSkills: "بسته‌های مهارتی",
    navMcp: "مرکز پروتکل MCP",
    workspaceTitle: "فضای کاری شناختی انطباقی",
    workspaceDesc: "نشانی گره: 0x4FF8...A091 • بار توکن زمینه: ۱۲.۴٪ • مرکز چندعاملی: فعال",
    tabFeed: "جریان دستورات",
    tabArtifacts: "کاوشگر اسناد و فایل‌ها",
    tabResearch: "خط لوله عمیق وب",
    compileBtn: "کامپایل فایل",
    compilingStatus: "در حال کامپایل...",
    researchPlaceholder: "عبارت جستجو برای خزش در لایه‌های وب و استخراج مراجع...",
    workspaceInputPlaceholder: "درخواست یا پارامتر اجرای هدف را وارد کنید...",
    languageSelect: "English",
    homeQuickChat: "جریان گفتگوهای سیناپسی روی صفحه اصلی",
    viewWorkspaceLink: "مشاهده در حالت فضای کاری پیشرفته",
    cognitiveEngineReady: "موتور شناختی آماده است",
    recentAndProjects: "گفتگوها و پروژه‌های اخیر",
    newChatBtn: "ایجاد کانال گفتگوی جدید",
    active: "فعال",
    saved: "ذخیره‌شده",
    completed: "کامل‌شده",
    collapse: "بستن پنل کناری",
    expand: "نمایش پنل کناری",
    assistant: "دستیار هوشمند",
    personal: "شخصی",
    projects: "پروژه‌ها",
    automations: "اتوماسیون‌ها",
    integrations: "اتصال‌ها و ابزارها",
    settings: "تنظیمات",
    memory: "حافظه",
    home: "خانه"
  }
};
