// Data models for LocalRecall

export enum ContentType {
  Article = 'article',
  Video = 'video',
  PDF = 'pdf',
  Podcast = 'podcast',
  Note = 'note',
  Website = 'website',
  Other = 'other',
}

export enum AIProvider {
  Ollama = 'ollama',
  OpenAI = 'openai',
  Gemini = 'gemini',
  Claude = 'claude',
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  content: string;
  contentType: ContentType;
  summary?: string;
  detailedSummary?: string;
  keyPoints?: string[];
  sourceUrl?: string;
  sourceName?: string;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
  lastSummaryGeneration?: string;
  relatedCardIds?: string[];
  reviewDueDate?: string;
  reviewLevel?: number;
}

export interface Quiz {
  id: string;
  knowledgeCardId: string;
  questions: QuizQuestion[];
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  date: Date;
  answers: {
    questionId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
  }[];
  score: number; // Percentage correct
}

export interface ProviderSettings {
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
}

export interface UserSettings {
  id: string;
  theme?: string;
  
  // Current active AI provider
  activeProvider: AIProvider;
  
  // Ollama settings (backward compatibility)
  ollamaEndpoint?: string;
  ollamaModel?: string;
  ollamaTemperature?: number;
  defaultModel?: string;
  temperature?: number;
  
  // New provider-specific settings
  providers?: {
    ollama?: ProviderSettings;
    openai?: ProviderSettings;
    gemini?: ProviderSettings;
    claude?: ProviderSettings;
  };
  
  darkMode?: boolean;
  autoSummarize?: boolean;
  encryption?: boolean;
  reviewSettings?: {
    easyInterval: number;
    mediumInterval: number;
    hardInterval: number;
  };
}

// Search types
export interface SearchFilter {
  tag?: string;
  source?: string;
  dateRange?: {
    start?: number;
    end?: number;
  };
}

export interface SearchResults {
  items: KnowledgeCard[];
  total: number;
}

// Tags
export interface Tag {
  id: string;
  name: string;
  count: number;
}

// Sources
export interface Source {
  id: string;
  name: string;
  count: number;
  type: string;
  favicon?: string;
}

// Connection Status
export interface ConnectionStatus {
  connected: boolean;
  endpoint: string;
  error?: string;
}

// YouTube Video Data
export interface VideoData {
  videoId: string;
  title?: string;
  description?: string;
  thumbnails?: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  channelTitle?: string;
}

// Knowledge Graph Types
export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  sourceType: string;
}

export interface GraphLink {
  source: string;
  target: string;
  value?: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  links: GraphLink[];
} 