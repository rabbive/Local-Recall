// Gemini Provider Implementation
// Implements the ProviderInterface for Google's Gemini API

import { ChatOptions, Message } from '../ai-types';

/**
 * Tests if Gemini API is available with the given API key
 * @param apiKey - Gemini API key
 * @returns Promise<boolean> - true if connection successful
 */
export async function testConnection(apiKey?: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Test endpoint for Gemini - just get models list
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    console.error('Gemini connection error:', error);
    return false;
  }
}

/**
 * Converts local message format to Gemini format
 */
function formatMessages(messages: Message[]) {
  // Start with system prompt for context if present
  const systemPrompt = messages.find(m => m.role === 'system');
  const userAndAssistantMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
  
  // Gemini expects alternating user/model exchanges
  // A system prompt needs to be prepended to the first user message
  let geminiMessages = [];
  
  // Process remaining messages in user/assistant pairs
  for (let i = 0; i < userAndAssistantMessages.length; i++) {
    const current = userAndAssistantMessages[i];
    
    if (current.role === 'user') {
      let content = current.content;
      
      // Add system prompt to first user message if it exists
      if (i === 0 && systemPrompt) {
        content = `${systemPrompt.content}\n\n${content}`;
      }
      
      geminiMessages.push({
        role: 'user',
        parts: [{ text: content }]
      });
    } else if (current.role === 'assistant') {
      geminiMessages.push({
        role: 'model',
        parts: [{ text: current.content }]
      });
    }
  }
  
  return geminiMessages;
}

/**
 * Send a chat request to Gemini
 * @param messages - Array of message objects
 * @param options - Chat options including model, temperature, apiKey
 * @returns Promise<string> - The model's response
 */
export async function chat(
  messages: Message[],
  options?: ChatOptions & { apiKey?: string }
): Promise<string> {
  if (!options?.apiKey) {
    throw new Error('Gemini API key is required');
  }
  
  const model = options.model || 'gemini-pro';
  const temperature = options.temperature ?? 0.7;
  const endpoint = options.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
  
  try {
    const formattedMessages = formatMessages(messages);
    
    // Ensure we have at least one user message
    if (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].role !== 'user') {
      throw new Error('The last message must be from the user');
    }
    
    const payload = {
      contents: formattedMessages,
      generationConfig: {
        temperature,
        maxOutputTokens: options.maxTokens || 1024,
        stopSequences: options.stopSequences
      }
    };
    
    const response = await fetch(`${endpoint}/models/${model}:generateContent?key=${options.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        return candidate.content.parts[0].text || '';
      }
    }
    
    return '';
  } catch (error: unknown) {
    console.error('Gemini chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to communicate with Gemini: ${errorMessage}`);
  }
} 