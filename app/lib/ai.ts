// AI Interface for LocalRecall
// This file acts as a wrapper around the aiManager singleton to provide
// backward compatibility and transition to the new multi-provider architecture

import { ChatOptions, Message } from './ai-types';
import { aiManager } from './ai-manager';

// Export the aiManager directly
export { aiManager };

// Re-export types from ai-types
export type { Message, ChatOptions };

// Legacy functions for backward compatibility
export async function generateSummary(
  content: string
): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  return aiManager.generateSummary(content);
}

export async function chat(messages: Message[], options?: ChatOptions): Promise<string> {
  return aiManager.chat(messages, options);
}

export async function testConnection(endpoint?: string): Promise<boolean> {
  // If endpoint is provided, we assume it's for Ollama (backward compatibility)
  if (endpoint) {
    // Import directly to avoid circular dependencies
    const { testConnection } = await import('./providers/ollama');
    return testConnection(endpoint);
  }
  
  return aiManager.testConnection();
}

// Legacy function to check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
  // Import directly to avoid circular dependencies
  const { testConnection } = await import('./providers/ollama');
  return testConnection('http://localhost:11434');
} 