import { useState } from "react";
import { 
  Settings, 
  Brain, 
  Terminal, 
  Bell, 
  Shield, 
  Link as LinkIcon, 
  Palette, 
  CheckCircle,
  Compass,
  Key,
  Trash2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import useProviders from "../hooks/useProviders";

interface SettingsSectionProps {
  language: "en" | "fa";
  theme?: "dark" | "light";
  setTheme?: (theme: "dark" | "light") => void;
}

const settingsTranslations = {
  en: {
    title: "System Settings",
    subtitle: "CONVOLUTED OPERATING SYSTEM PREFERENCES • CORE AGENT WEIGHTS • SYSTEM CLEARANCE",
    tabGeneral: "General",
    tabAI: "AI Preferences",
    tabSkills: "Installed Skills",
    tabNotifs: "Notifications",
    tabPrivacy: "Privacy & Security",
    tabConnected: "Connected Accounts",
    
    generalPref: "General Preferences",
    generalPrefSub: "Adjust the visual parameters of your Cognitive OS interface.",
    appearanceTheme: "Appearance Theme",
    darkTheme: "Cosmic Slate (Dark Mode)",
    lightTheme: "Clean Studio (Light Mode)",
    accentColorPath: "Accent Color Pathway",
    systemLang: "System Language Base",
    systemLangSub: "Configured globally (EN/FA switch on top right header)",
    
    aiPref: "AI Core & Provider Credentials",
    aiPrefSub: "Configure isolated project MiMo Code provider keys and reasoning preferences.",
    providersTitle: "Configured Providers",
    providersSub: "API keys are stored securely in the project-local runtime auth.json.",
    addKey: "Add / Update Key",
    removeKey: "Revoke",
    refreshModelsBtn: "Refresh Models Catalog",
    
    skillsTitle: "Installed Skills",
    skillsSub: "Skill bundles can be invoked instantly inside any conversation using slash commands.",
    skillsActive: "ACTIVE",
    skillsDisabled: "DISABLED",
    
    notifTitle: "System Notifications",
    notifSub: "Adjust your alerts, dispatch rules, and system summaries.",
    desktopNotifs: "Desktop Notification Banners",
    desktopNotifsSub: "Push notification cards inside browser sandboxes.",
    emailDigests: "Email Digest & Logs",
    emailDigestsSub: "Receive critical task completions and research briefs via mail.",
    
    privacyTitle: "Privacy & Security Controls",
    privacySub: "Control data retention, memory controls, and sandbox access parameters.",
    dataRetention: "Data Retention Horizon",
    retention30: "30 Days (Automatic Purge)",
    retention90: "90 Days",
    retentionNever: "Never Delete (Durable local sync)",
    persistentMemory: "Persistent Memory Control",
    persistentMemorySub: "Allows the model to write new persistent facts from your chats.",
    securedStatus: "Secured",
    
    connectedTitle: "Connected Third-Party Accounts",
    connectedSub: "Manage standard API connection channels, linked Slack tokens, or GitHub Oauths.",
    centralizedControl: "Centralized Integration Control",
    centralizedDesc: "You can manage all linked APIs, sync settings, calendar pipelines, and Drive folders directly within the Integrations tab.",
    
    saveNotice: "PROJECT-LOCAL ISOLATED RUNTIME ACTIVE",
    saved: "Saved"
  },
  fa: {
    title: "تنظیمات سیستم",
    subtitle: "ترجیحات سیستم‌عامل شناختی میمو • وزن‌های هسته عامل عصبی • سطح دسترسی",
    tabGeneral: "عمومی و ظاهری",
    tabAI: "ترجیحات هوش مصنوعی",
    tabSkills: "مهارت‌های نصب‌شده",
    tabNotifs: "اعلان‌ها و هشدارها",
    tabPrivacy: "حریم خصوصی و امنیت",
    tabConnected: "حساب‌های متصل",
    
    generalPref: "ترجیحات عمومی ظاهری",
    generalPrefSub: "پارامترهای بصری و قالب‌های رابط کاربری شناختی خود را سفارشی کنید.",
    appearanceTheme: "تم و قالب ظاهری سیستم",
    darkTheme: "لوکس تاریک (Cosmic Slate)",
    lightTheme: "روشن مدرن (Clean Studio)",
    accentColorPath: "رنگ شاخص و مسیرهای عصبی",
    systemLang: "زبان پیش‌فرض هسته سیستم",
    systemLangSub: "تنظیم به صورت سراسری (با دکمه سوئیچر EN/FA در منوی بالای صفحه)",
    
    aiPref: "هسته هوش مصنوعی و کلیدهای ارائه‌دهنده",
    aiPrefSub: "تنظیم کلیدهای ارائه‌دهنده ایزوله پروژه و ترجیحات استدلال.",
    providersTitle: "ارائه‌دهندگان پیکربندی‌شده",
    providersSub: "کلیدهای API به صورت امن در فایل auth.json زمان اجرای محلی پروژه ذخیره می‌شوند.",
    addKey: "افزودن / به‌روزرسانی کلید",
    removeKey: "حذف کلید",
    refreshModelsBtn: "بازخوانی کاتالوگ مدل‌ها",
    
    skillsTitle: "مهارت‌های نصب‌شده سیستم",
    skillsSub: "بسته‌های مهارتی را می‌توان بلافاصله در هر گفتگو با استفاده از دستورات اسلش (/) فراخوانی کرد.",
    skillsActive: "فعال",
    skillsDisabled: "غیرفعال",
    
    notifTitle: "اعلان‌ها و هشدارهای سیستمی",
    notifSub: "هشدارهای سیستمی، قوانین دیسپچ و خلاصه ماموریت‌ها را مدیریت کنید.",
    desktopNotifs: "بنر اعلان‌های دسکتاپ مرورگر",
    desktopNotifsSub: "کارت‌های اعلان شناور در داخل سندباکس سیستم‌عامل.",
    emailDigests: "خلاصه گزارش‌ها به ایمیل",
    emailDigestsSub: "دریافت ایمیل‌های دوره‌ای از تکمیل موفقیت‌آمیز مأموریت‌ها و مراجع وب.",
    
    privacyTitle: "کنترل‌های امنیتی و حریم خصوصی",
    privacySub: "زمان نگهداری داده‌ها، کنترل‌های خودکار حافظه و دسترسی‌های سندباکس.",
    dataRetention: "مدت زمان نگهداری داده‌ها",
    retention30: "۳۰ روز (پاکسازی خودکار دوره‌ای)",
    retention90: "۹۰ روز",
    retentionNever: "هیچ‌وقت حذف نشود (همگام‌سازی محلی پایدار)",
    persistentMemory: "ثبت خودکار اطلاعات در حافظه عمیق",
    persistentMemorySub: "به مدل اجازه می‌دهد فکت‌های جدیدی را از گفتگوهای شما استخراج و ذخیره کند.",
    securedStatus: "کاملاً ایمن",
    
    connectedTitle: "حساب‌های متصل شخص ثالث",
    connectedSub: "مدیریت کانال‌های اتصال استاندارد API، توکن‌های اسلک یا گیت‌هاب.",
    centralizedControl: "کنترل یکپارچه اتصال‌ها",
    centralizedDesc: "شما می‌توانید تمام APIهای متصل، تنظیمات همگام‌سازی، تقویم‌ها و پوشه‌های گوگل درایو را مستقیماً در برگه «اتصال‌ها و ابزارها» مدیریت کنید.",
    saveNotice: "زمان اجرای محلی پروژه ایزوله فعال است",
    saved: "ذخیره شد"
  }
};

export default function SettingsSection({ language, theme = "dark", setTheme }: SettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<"general" | "ai" | "skills" | "notifications" | "privacy" | "connected">("general");
  const [accentColor, setAccentColor] = useState("#5DF7FF");
  const [reasoningMode, setReasoningMode] = useState(true);
  const [responseStyle, setResponseStyle] = useState("concise");

  const { providers, loading: provLoading, error: provError, addCredential, removeCredential, refreshing, refreshCatalog } = useProviders();
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [credentialKey, setCredentialKey] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [emailNotif, setEmailNotif] = useState(true);
  const [desktopNotif, setDesktopNotif] = useState(false);
  const [dataRetention, setDataRetention] = useState("30");

  const isRtl = language === "fa";
  const st = settingsTranslations[language];

  const [skills, setSkills] = useState([
    { 
      id: "s-1", 
      name: language === "fa" ? "ارزیاب استارتاپ" : "Startup Evaluator", 
      command: "/startup", 
      desc: language === "fa" ? "تحلیل چند مرحله‌ای ارائه‌ها، فایل‌های مالی و مدل‌های درآمدی استارتاپی." : "Runs multi-stage logic analysis on company pitch documents, spreadsheets, and budgets.", 
      installed: true 
    },
    { 
      id: "s-2", 
      name: language === "fa" ? "نویسنده سئو" : "SEO Optimization Writer", 
      command: "/seo", 
      desc: language === "fa" ? "تحلیل تکرار کلمات کلیدی، بهینه‌سازی کدهای فرانت‌اند برای خزنده گوگل." : "Synthesizes search terms, analyzes keyword frequencies, and generates content.", 
      installed: true 
    },
    { 
      id: "s-3", 
      name: language === "fa" ? "ممیز سالیدیتی" : "Solidity Security Auditor", 
      command: "/audit", 
      desc: language === "fa" ? "بررسی بازگشتی کدهای قراردادهای هوشمند اتریوم برای جلوگیری از نفوذ." : "Performs recursive cryptographic audits on smart contract logic to map overflow vulnerabilities.", 
      installed: true 
    },
    { 
      id: "s-4", 
      name: language === "fa" ? "تحلیلگر اکسل" : "Excel Advanced Analyst", 
      command: "/excel", 
      desc: language === "fa" ? "پردازش فایل‌های اکسل، ایجاد نمودارهای مالی و استخراج ردیف‌های بودجه." : "Compiles pivot layouts, analyzes balance charts, and outputs spending categories.", 
      installed: true 
    },
    { 
      id: "s-5", 
      name: language === "fa" ? "دستیار پژوهشی دانشگاه" : "Academic Research Assistant", 
      command: "/research", 
      desc: language === "fa" ? "خزش پیشرفته در وب، یافتن مقالات ساینس و ایجاد فایل رفرنس‌های بیب‌تک." : "Crawls web pathways, fetches accurate academic references and gathers citations.", 
      installed: true 
    }
  ]);

  const tabs = [
    { id: "general", label: st.tabGeneral, icon: Palette },
    { id: "ai", label: st.tabAI, icon: Brain },
    { id: "skills", label: st.tabSkills, icon: Terminal },
    { id: "notifications", label: st.tabNotifs, icon: Bell },
    { id: "privacy", label: st.tabPrivacy, icon: Shield },
    { id: "connected", label: st.tabConnected, icon: LinkIcon }
  ] as const;

  const handleToggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, installed: !s.installed } : s));
  };

  const textAlignment = isRtl ? "text-right" : "text-left";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none" dir={isRtl ? "rtl" : "ltr"}>
      
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5 ${textAlignment}`}>
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Settings className="text-neural-cyan" size={20} />
            {st.title}
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5 tracking-wider uppercase">
            {st.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-1.5 p-2 bg-white/[0.01] border border-white/5 rounded-2xl">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-xs font-semibold w-full cursor-pointer ${
                  isRtl ? "text-right justify-start" : "text-left"
                } ${
                  active 
                    ? "bg-[#5DF7FF]/10 text-neural-cyan border border-neural-cyan/15 shadow-[0_0_15px_rgba(93,247,255,0.05)]" 
                    : "text-titanium/50 hover:text-white hover:bg-white/3"
                }`}
              >
                <IconComponent size={15} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="md:col-span-8 lg:col-span-9 p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between min-h-[450px]">
          
          <div className={`space-y-6 ${textAlignment}`}>
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{st.generalPref}</h3>
                  <p className="text-xs text-titanium/40">{st.generalPrefSub}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-xs font-semibold text-white/80">{st.appearanceTheme}</span>
                    <select 
                      value={theme}
                      onChange={(e) => setTheme?.(e.target.value as "dark" | "light")}
                      className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan/30 cursor-pointer"
                    >
                      <option value="dark">{st.darkTheme}</option>
                      <option value="light">{st.lightTheme}</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-xs font-semibold text-white/80">{st.accentColorPath}</span>
                    <div className="flex gap-2">
                      {[
                        { color: "#5DF7FF", name: "Cyan" },
                        { color: "#A855F7", name: "Purple" },
                        { color: "#EC4899", name: "Pink" },
                        { color: "#10B981", name: "Emerald" },
                        { color: "#F59E0B", name: "Amber" }
                      ].map(item => (
                        <button
                          key={item.color}
                          onClick={() => setAccentColor(item.color)}
                          className="w-5 h-5 rounded-full border border-white/20 transition-all hover:scale-110 cursor-pointer relative"
                          style={{ backgroundColor: item.color }}
                          title={item.name}
                        >
                          {accentColor === item.color && (
                            <span className="absolute inset-1 bg-black rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs font-semibold text-white/80">{st.systemLang}</span>
                    <span className="text-xs text-titanium/50 font-mono">
                      {st.systemLangSub}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{st.aiPref}</h3>
                  <p className="text-xs text-titanium/40">{st.aiPrefSub}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div className="max-w-[70%]">
                      <span className="text-xs font-semibold text-white/80 block">Continuous Reasoning Mode</span>
                      <span className="text-[10px] text-titanium/45">Allows the model to think extensively before emitting results.</span>
                    </div>
                    <button
                      onClick={() => setReasoningMode(!reasoningMode)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer ${
                        reasoningMode ? "bg-neural-cyan" : "bg-white/10"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-black rounded-full transition-all ${
                        reasoningMode ? (isRtl ? "-translate-x-0" : "translate-x-5") : (isRtl ? "-translate-x-5" : "translate-x-0")
                      }`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-xs font-semibold text-white/80">Response Synthesis Style</span>
                    <select 
                      value={responseStyle}
                      onChange={(e) => setResponseStyle(e.target.value)}
                      className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan/30 cursor-pointer"
                    >
                      <option value="concise">Concise & Direct (Speed)</option>
                      <option value="verbose">Comprehensive & Structured</option>
                      <option value="code-first">Technical & Code-centric</option>
                    </select>
                  </div>

                  {/* Providers Management Section */}
                  <div className="space-y-4 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-white">{st.providersTitle}</h4>
                        <p className="text-[10px] text-titanium/45">{st.providersSub}</p>
                      </div>
                      <button
                        onClick={refreshCatalog}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono text-neural-cyan transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                        {st.refreshModelsBtn}
                      </button>
                    </div>

                    {provLoading ? (
                      <div className="text-xs text-titanium/50 py-4 text-center font-mono">Loading providers...</div>
                    ) : (
                      <div className="space-y-2">
                        {providers.map((p) => (
                          <div key={p.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{p.name}</span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  p.hasCredential ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-titanium/40"
                                }`}>
                                  {p.hasCredential ? "Configured" : "No Key"}
                                </span>
                              </div>
                              <span className="text-[10px] text-titanium/40 font-mono">
                                {p.modelCount} models available ({p.id})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {selectedProviderId === p.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="password"
                                    autoComplete="off"
                                    placeholder="API Key..."
                                    value={credentialKey}
                                    onChange={(e) => setCredentialKey(e.target.value)}
                                    className="bg-[#111] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-neural-cyan/30 w-36"
                                  />
                                  <button
                                    onClick={async () => {
                                      setActionError(null);
                                      setActionSuccess(null);
                                      try {
                                        await addCredential(p.id, credentialKey);
                                        setCredentialKey('');
                                        setSelectedProviderId('');
                                        setActionSuccess(`Credential saved for ${p.name}`);
                                      } catch (err: any) {
                                        setActionError(err?.message || 'Failed to save');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-neural-cyan text-black rounded-lg text-[10px] font-mono font-bold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setSelectedProviderId(''); setCredentialKey(''); }}
                                    className="px-2 py-1 bg-white/5 text-titanium/60 rounded-lg text-[10px] font-mono cursor-pointer hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => { setSelectedProviderId(p.id); setCredentialKey(''); }}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono text-white transition-all cursor-pointer"
                                  >
                                    <Key size={11} />
                                    {st.addKey}
                                  </button>
                                  {p.hasCredential && (
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Revoke key for ${p.name}?`)) {
                                          try {
                                            await removeCredential(p.id);
                                            setActionSuccess(`Key removed for ${p.name}`);
                                          } catch (err: any) {
                                            setActionError(err?.message || 'Failed to remove');
                                          }
                                        }
                                      }}
                                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                                      title={st.removeKey}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(provError || actionError) && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono">
                        <AlertTriangle size={14} className="shrink-0" />
                        {provError || actionError}
                      </div>
                    )}

                    {actionSuccess && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-mono">
                        <CheckCircle size={14} className="shrink-0" />
                        {actionSuccess}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{st.skillsTitle}</h3>
                  <p className="text-xs text-titanium/40">{st.skillsSub}</p>
                </div>

                <div className="space-y-3 pt-2">
                  {skills.map(skill => (
                    <div key={skill.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between gap-4">
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">{skill.name}</span>
                          <span className="text-[10px] text-neural-cyan font-mono bg-neural-cyan/10 px-1.5 rounded" dir="ltr">
                            {skill.command}
                          </span>
                        </div>
                        <p className="text-[11px] text-titanium/50 line-clamp-2">
                          {skill.desc}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleSkill(skill.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer shrink-0 ${
                          skill.installed 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-white/5 text-titanium/40 hover:bg-white/10"
                        }`}
                      >
                        {skill.installed ? st.skillsActive : st.skillsDisabled}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{st.notifTitle}</h3>
                  <p className="text-xs text-titanium/40">{st.notifSub}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div className="max-w-[70%]">
                      <span className="text-xs font-semibold text-white/80 block">{st.desktopNotifs}</span>
                      <span className="text-[10px] text-titanium/45">{st.desktopNotifsSub}</span>
                    </div>
                    <button
                      onClick={() => setDesktopNotif(!desktopNotif)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer ${
                        desktopNotif ? "bg-neural-cyan" : "bg-white/10"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-black rounded-full transition-all ${
                        desktopNotif ? (isRtl ? "-translate-x-0" : "translate-x-5") : (isRtl ? "-translate-x-5" : "translate-x-0")
                      }`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-2.5">
                    <div className="max-w-[70%]">
                      <span className="text-xs font-semibold text-white/80 block">{st.emailDigests}</span>
                      <span className="text-[10px] text-titanium/45">{st.emailDigestsSub}</span>
                    </div>
                    <button
                      onClick={() => setEmailNotif(!emailNotif)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer ${
                        emailNotif ? "bg-neural-cyan" : "bg-white/10"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-black rounded-full transition-all ${
                        emailNotif ? (isRtl ? "-translate-x-0" : "translate-x-5") : (isRtl ? "-translate-x-5" : "translate-x-0")
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{st.privacyTitle}</h3>
                  <p className="text-xs text-titanium/40">{st.privacySub}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-xs font-semibold text-white/80">{st.dataRetention}</span>
                    <select 
                      value={dataRetention}
                      onChange={(e) => setDataRetention(e.target.value)}
                      className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neural-cyan/30 cursor-pointer"
                    >
                      <option value="30">{st.retention30}</option>
                      <option value="90">{st.retention90}</option>
                      <option value="never">{st.retentionNever}</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center py-2.5">
                    <div>
                      <span className="text-xs font-semibold text-white/80 block">{st.persistentMemory}</span>
                      <span className="text-[10px] text-titanium/45">{st.persistentMemorySub}</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded">
                      {st.securedStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "connected" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{st.connectedTitle}</h3>
                  <p className="text-xs text-titanium/40">{st.connectedSub}</p>
                </div>

                <div className="p-5 bg-white/3 border border-white/5 rounded-xl text-center space-y-3">
                  <div className="flex justify-center text-neural-cyan">
                    <Compass size={32} />
                  </div>
                  <h4 className="text-xs font-bold text-white">{st.centralizedControl}</h4>
                  <p className="text-[11px] text-titanium/50 max-w-sm mx-auto leading-relaxed">
                    {st.centralizedDesc}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-titanium/30 mt-6">
            <span>{st.saveNotice}</span>
            <span className="flex items-center gap-1 text-neural-cyan">
              <CheckCircle size={10} /> {st.saved}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
