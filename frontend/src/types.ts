export enum OrbState {
  Idle = "Idle",
  Listening = "Listening",
  Thinking = "Thinking",
  Researching = "Researching",
  Executing = "Executing",
  Collaborating = "Collaborating",
  Learning = "Learning",
  Completed = "Completed",
  Error = "Error",
  Streaming = "Streaming",
}

export enum InteractionMode {
  Direct = "direct",
  Plan = "plan",
  Agent = "agent"
}

export enum ActiveView {
  Home = "Home",
  Chat = "Chat",
  Projects = "Projects",
  Workspace = "Workspace",
  Automations = "Automations",
  Memory = "Memory",
  Integrations = "Integrations",
  Settings = "Settings"
}

export interface Message {
  id: string;
  sender: "user" | "system" | "agent";
  agentName?: string;
  text: string;
  timestamp: string;
  status?: "pending" | "streaming" | "done";
  tokensPerSec?: number;
  events: ActivityEntry[];
  artifacts: Artifact[];
  reasoning?: string;
  mode?: string;
  isQuestion?: boolean;
  questionOptions?: string[];
}

export interface Artifact {
  id: string;
  type: "file" | "code" | "image";
  name: string;
  path?: string;
  content?: string;
  language?: string;
}

export interface FileItem {
  name: string;
  type: "code" | "document" | "json" | "image";
  size: string;
  content: string;
  path: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: "idle" | "thinking" | "executing" | "learning" | "offline";
  activity: string;
  progress: number;
  confidence: number;
  skills: string[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed" | "paused";
  progress: number;
  confidence: number;
  judgeValidation: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "Utilities" | "Data Science" | "Automation" | "Creative" | "Development";
  installed: boolean;
  downloads: string;
  developer: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "Databases" | "Messaging" | "Productivity" | "Hosting" | "Analytics";
  connected: boolean;
  mcpCompliant: boolean;
  author: string;
}

export interface Subject {
  id: string;
  name: string;
  date: string;
  dateFa: string;
  status: string;
  messages: Message[];
  category?: "personal" | "projects";
}

export interface ActivityEntry {
  id: string;
  type: 'reasoning' | 'tool' | 'step' | 'text';
  toolName?: string;
  label: string;
  detail: string;
  icon: string;
  iconColor: string;
  timestamp: number;
  status: 'running' | 'completed' | 'error';
}

export interface CliSession {
  id: string;
  title: string;
  updatedAt: number;
}

export interface ExportedSession {
  info: {
    id: string;
    title: string;
    projectID: string;
    directory: string;
    time: { created: number; updated: number };
  };
  messages: ExportedMessage[];
}

export interface ExportedMessage {
  info: {
    id: string;
    sessionID: string;
    role: 'user' | 'assistant' | 'system';
    agent?: string;
    model?: { providerID: string; modelID: string };
    time?: { created: number; completed?: number };
    tokens?: { total: number; input: number; output: number; reasoning: number };
    cost?: number;
    mode?: string;
    parentID?: string;
    finish?: string;
  };
  parts: ExportedPart[];
}

export interface ExportedPart {
  type: string;
  id?: string;
  text?: string;
  tool?: string;
  callID?: string;
  state?: { status: string; input?: Record<string, unknown>; output?: string };
  time?: { start: number; end: number };
  tokens?: { total: number; input: number; output: number; reasoning: number };
  cost?: number;
  reason?: string;
}

