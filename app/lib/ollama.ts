// Ollama API service for LocalRecall
// This service handles communication with the local Ollama instance

import { settingsAPI } from './storage';

export interface OllamaOptions {
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  customPrompt?: string; // Add support for custom prompt templates
  contentType?: string;
}

export interface SummarizationRequest {
  content: string;
  options?: OllamaOptions;
}

export interface SummarizationResponse {
  summary: string;
  detailedSummary: string;
  keyPoints: string[];
}

export interface QuizGenerationRequest {
  content: string;
  numberOfQuestions?: number;
  options?: OllamaOptions;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizGenerationResponse {
  questions: QuizQuestion[];
}

// Environment detection
const isBrowser = typeof window !== 'undefined';
const isServer = !isBrowser;

// Function to test if Ollama is available
export async function testConnection(endpoint?: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const targetEndpoint = endpoint || await getOllamaEndpoint();
    
    try {
      const response = await fetch(`${targetEndpoint}/api/tags`, {
        signal: controller.signal,
        method: 'GET',
        // Use no-cors mode for CORS errors
        // This won't give us response data but will let us check if endpoint is alive
        mode: 'no-cors',
      });
      
      clearTimeout(timeoutId);
      return true; // If we get here with no-cors, endpoint is reachable
    } catch (fetchError) {
      // Try alternative endpoints if the provided one fails
      if (endpoint) {
        return false; // Return false if the specific endpoint test fails
      }
      
      // For auto-detection, try common alternative endpoints
      const alternativeEndpoints = [
        'http://localhost:11434',
        'http://127.0.0.1:11434',
        'http://0.0.0.0:11434'
      ];
      
      for (const altEndpoint of alternativeEndpoints) {
        if (altEndpoint === targetEndpoint) continue; // Skip if same as original
        
        try {
          const altResponse = await fetch(`${altEndpoint}/api/tags`, {
            signal: controller.signal,
            method: 'GET',
            mode: 'no-cors',
          });
          
          // Update the endpoint in settings if this one works
          if (isBrowser) {
            const settings = await settingsAPI.getSettings();
            if (settings.ollamaEndpoint !== altEndpoint) {
              await updateConfig({ endpoint: altEndpoint });
              console.log(`Updated Ollama endpoint to ${altEndpoint}`);
            }
          }
          
          clearTimeout(timeoutId);
          return true;
        } catch (altError) {
          // Continue to next alternative
          console.log(`Failed to connect to alternative endpoint ${altEndpoint}`);
        }
      }
      
      clearTimeout(timeoutId);
      return false;
    }
  } catch (error) {
    console.error('Error testing Ollama connection:', error);
    return false;
  }
}

// Function to get the Ollama endpoint from settings
export async function getOllamaEndpoint(): Promise<string> {
  try {
    if (isServer) {
      // Default endpoint for server-side
      return process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    }
    
    const settings = await settingsAPI.getSettings();
    return settings.ollamaEndpoint;
  } catch (error) {
    console.error('Error getting Ollama endpoint:', error);
    return 'http://localhost:11434';
  }
}

// Function to get the default Ollama model
export async function getOllamaModel(): Promise<string> {
  try {
    if (isServer) {
      // Default model for server-side
      return process.env.OLLAMA_MODEL || 'gemma3:4b';
    }
    
    const settings = await settingsAPI.getSettings();
    return settings.ollamaModel || settings.defaultModel || 'gemma3:4b';
  } catch (error) {
    console.error('Error getting Ollama model:', error);
    return 'gemma3:4b';
  }
}

// Function to get the temperature setting
export async function getTemperature(): Promise<number> {
  try {
    if (isServer) {
      // Default temperature for server-side
      return process.env.OLLAMA_TEMPERATURE ? parseFloat(process.env.OLLAMA_TEMPERATURE) : 0.7;
    }
    
    const settings = await settingsAPI.getSettings();
    return settings.ollamaTemperature || settings.temperature || 0.7;
  } catch (error) {
    console.error('Error getting temperature:', error);
    return 0.7;
  }
}

// Function to update the Ollama configuration
export async function updateConfig(config: {
  endpoint?: string;
  model?: string;
  temperature?: number;
}): Promise<boolean> {
  try {
    if (isServer) {
      console.error('Cannot update config on server side');
      return false;
    }
    
    const settings = await settingsAPI.getSettings();
    
    const updatedSettings = {
      ...settings,
      ollamaEndpoint: config.endpoint || settings.ollamaEndpoint,
      ollamaModel: config.model || settings.ollamaModel,
      ollamaTemperature: config.temperature !== undefined ? config.temperature : settings.ollamaTemperature,
    };
    
    await settingsAPI.updateSettings(updatedSettings);
    return true;
  } catch (error) {
    console.error('Error updating Ollama config:', error);
    return false;
  }
}

// Ollama chat function
export async function chat(
  messages: { role: string; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
    stream?: boolean;
    onToken?: (token: string) => void;
  }
): Promise<string> {
  try {
    const endpoint = await getOllamaEndpoint();
    const model = options?.model || await getOllamaModel();
    const temperature = options?.temperature !== undefined ? options.temperature : await getTemperature();
    
    if (options?.stream && options.onToken) {
      return streamChat(messages, model, temperature, endpoint, options.onToken);
    }
    
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        options: {
          temperature,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error in Ollama chat:', error);
    throw error;
  }
}

// Stream chat responses token by token
async function streamChat(
  messages: { role: string; content: string }[],
  model: string,
  temperature: number,
  endpoint: string,
  onToken: (token: string) => void
): Promise<string> {
  try {
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        options: {
          temperature,
        },
        stream: true,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const token = data.message?.content || '';
          fullContent += token;
          onToken(token);
        } catch (error) {
          console.error('Error parsing streaming response:', error);
        }
      }
    }
    
    return fullContent;
  } catch (error) {
    console.error('Error in streaming Ollama chat:', error);
    throw error;
  }
}

// Function to generate a summary of content
export async function generateSummary(content: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes content concisely. Provide a brief summary and a list of key points.',
      },
      {
        role: 'user',
        content: `Please summarize the following content and extract 3-5 key points:
        
${content}`,
      },
    ];
    
    const result = await chat(messages);
    
    // Parse the response to extract summary and key points
    const summaryMatch = result.match(/Summary:(.*?)Key Points:/i);
    const keyPointsMatch = result.match(/Key Points:(.*)/i);
    
    const summary = summaryMatch ? summaryMatch[1].trim() : result;
    let keyPoints: string[] = [];
    
    if (keyPointsMatch) {
      const keyPointsText = keyPointsMatch[1].trim();
      keyPoints = keyPointsText
        .split(/\s*[-*•]\s*/)
        .filter(point => point.trim())
        .map(point => point.trim());
    }
    
    return {
      summary,
      keyPoints,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

// Export the service functions
export const ollamaService = {
  testConnection,
  getOllamaEndpoint,
  getOllamaModel,
  getTemperature,
  updateConfig,
  chat,
  generateSummary,
}; 