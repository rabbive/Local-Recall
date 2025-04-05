// Claude Provider Implementation
// Implements the ProviderInterface for Anthropic Claude API

import { ChatOptions, Message } from '../ai-types';

/**
 * Tests if Claude API is available with the given API key
 * @param apiKey - Claude API key
 * @returns Promise<boolean> - true if connection successful
 */
export async function testConnection(apiKey?: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Test endpoint for Claude - just get the models list 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'OPTIONS',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Claude API doesn't have a dedicated test endpoint, but OPTIONS should work
    return response.status !== 401 && response.status !== 403;
  } catch (error) {
    console.error('Claude connection error:', error);
    return false;
  }
}

/**
 * Send a chat request to Claude
 * @param messages - Array of message objects
 * @param options - Chat options including model, temperature, apiKey
 * @returns Promise<string> - The model's response
 */
export async function chat(
  messages: Message[],
  options?: ChatOptions & { apiKey?: string }
): Promise<string> {
  if (!options?.apiKey) {
    throw new Error('Claude API key is required');
  }
  
  const model = options.model || 'claude-3-haiku-20240307';
  const temperature = options.temperature ?? 0.7;
  const endpoint = options.endpoint || 'https://api.anthropic.com/v1/messages';
  
  try {
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const userAndAssistantMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    
    // Claude expects alternating user/assistant pairs
    const claudeMessages = userAndAssistantMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Ensure we have at least one user message
    if (claudeMessages.length === 0 || claudeMessages[claudeMessages.length - 1].role !== 'user') {
      throw new Error('The last message must be from the user');
    }
    
    const payload = {
      model,
      messages: claudeMessages,
      system: systemMessage?.content,
      temperature,
      max_tokens: options.maxTokens || 1024,
      stop_sequences: options.stopSequences
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract the response content
    if (data.content && data.content.length > 0) {
      return data.content[0].text || '';
    }
    
    return '';
  } catch (error: unknown) {
    console.error('Claude chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to communicate with Claude: ${errorMessage}`);
  }
} 