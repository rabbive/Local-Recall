// OpenAI Provider Implementation
// Implements the ProviderInterface for OpenAI API

import { ChatOptions, Message } from '../ai-types';

/**
 * Tests if OpenAI API is available with the given API key
 * @param apiKey - OpenAI API key
 * @returns Promise<boolean> - true if connection successful
 */
export async function testConnection(apiKey?: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    console.error('OpenAI connection error:', error);
    return false;
  }
}

/**
 * Send a chat request to OpenAI
 * @param messages - Array of message objects
 * @param options - Chat options including model, temperature, apiKey
 * @returns Promise<string> - The model's response
 */
export async function chat(
  messages: Message[],
  options?: ChatOptions & { apiKey?: string }
): Promise<string> {
  if (!options?.apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  const model = options.model || 'gpt-3.5-turbo';
  const temperature = options.temperature ?? 0.7;
  const endpoint = options.endpoint || 'https://api.openai.com/v1';
  
  try {
    const payload = {
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature,
      max_tokens: options.maxTokens || 1024,
      stop: options.stopSequences || undefined
    };
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Handle both streaming and non-streaming responses
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      return choice.message?.content || '';
    }
    
    return '';
  } catch (error: unknown) {
    console.error('OpenAI chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to communicate with OpenAI: ${errorMessage}`);
  }
} 