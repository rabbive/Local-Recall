// Types for AI Provider interfaces

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  endpoint?: string;
  apiKey?: string;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProviderInterface {
  chat: (messages: Message[], options?: ChatOptions) => Promise<string>;
  testConnection: () => Promise<boolean>;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
} 