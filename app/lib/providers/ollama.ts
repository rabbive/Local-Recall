// Ollama Provider Implementation
// Implements the ProviderInterface for Ollama LLM

import { ChatOptions, Message } from '../ai-types';

/**
 * Tests if Ollama is available at the specified endpoint
 * @param endpoint - URL to Ollama API
 * @returns Promise<boolean> - true if connection successful
 */
export async function testConnection(endpoint: string = 'http://localhost:11434'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Try to fetch the models list from Ollama
    const fetchOpts: RequestInit = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      mode: 'cors',
    };
    
    try {
      // First try with default cors mode
      const response = await fetch(`${endpoint}/api/tags`, fetchOpts);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.log('Initial connection test failed, trying no-cors');
      // If that fails, try with no-cors mode (but this will always return opaque response)
      try {
        const noCorsOpts = { ...fetchOpts, mode: 'no-cors' as RequestMode };
        await fetch(`${endpoint}/api/tags`, noCorsOpts);
        clearTimeout(timeoutId);
        // If we get here without error, there's likely a CORS issue but server might be up
        return true;
      } catch (noCorsErr) {
        // Both attempts failed
        clearTimeout(timeoutId);
        
        // Try alternative endpoint formats as fallback
        const altEndpoints = [];
        
        // If endpoint is localhost:11434 without protocol, try adding http://
        if (endpoint.match(/^localhost/)) {
          altEndpoints.push(`http://${endpoint}`);
        }
        
        // Try removing trailing slashes
        if (endpoint.endsWith('/')) {
          altEndpoints.push(endpoint.slice(0, -1));
        }
        
        // Try alternative ports
        if (endpoint.includes('11434')) {
          altEndpoints.push(endpoint.replace('11434', '8000'));
        }
        
        // Try each alternative
        for (const altEndpoint of altEndpoints) {
          try {
            const altResponse = await fetch(`${altEndpoint}/api/tags`, {
              ...fetchOpts,
              signal: undefined, // Create new abort controller if needed
            });
            if (altResponse.ok) {
              return true;
            }
          } catch (err) {
            // Continue to next alternative
            console.log(`Alternative endpoint ${altEndpoint} failed`);
          }
        }
        
        return false;
      }
    }
  } catch (error) {
    console.error('Ollama connection error:', error);
    return false;
  }
  
  return false;
}

/**
 * Send a chat request to Ollama
 * @param messages - Array of message objects
 * @param options - Chat options including model, temperature, etc.
 * @returns Promise<string> - The model's response
 */
export async function chat(
  messages: Message[],
  options?: ChatOptions & { endpoint?: string }
): Promise<string> {
  const endpoint = options?.endpoint || 'http://localhost:11434';
  const model = options?.model || 'gemma3:4b';
  const temperature = options?.temperature ?? 0.7;
  
  try {
    const payload = {
      model: model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      options: {
        temperature: temperature,
        num_predict: options?.maxTokens || 2048,
      },
      stream: false
    };
    
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data.message?.content || '';
  } catch (error: unknown) {
    console.error('Ollama chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to communicate with Ollama: ${errorMessage}`);
  }
} 