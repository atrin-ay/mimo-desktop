export enum OrbState {
  Idle = "Idle",
  Listening = "Listening",
  Thinking = "Thinking",
  Researching = "Researching",
  Executing = "Executing",
  Collaborating = "Collaborating",
  Learning = "Learning",
  Completed = "Completed"
}

export enum InteractionMode {
  Direct = "direct",
  Plan = "plan",
  Agent = "agent"
}

export enum ActiveView {
  Home = "Home",
  AssistantPersonal = "AssistantPersonal",
  AssistantProjects = "AssistantProjects",
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

