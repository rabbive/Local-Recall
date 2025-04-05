// AI Manager for LocalRecall
// Unified interface to multiple LLM providers

import { settingsAPI } from './storage';
import { AIProvider, ProviderSettings, UserSettings } from './models';
import { ChatOptions, Message, ProviderInterface } from './ai-types';

// Unified AI manager
class AIManager {
  private activeProvider: AIProvider = AIProvider.Ollama;
  private settings: UserSettings | null = null;
  
  // Initialize settings
  async init(): Promise<void> {
    try {
      this.settings = await settingsAPI.getSettings();
      this.activeProvider = this.settings.activeProvider || AIProvider.Ollama;
    } catch (error) {
      console.error('Error initializing AI manager:', error);
      // Default to Ollama if settings can't be loaded
      this.activeProvider = AIProvider.Ollama;
    }
  }
  
  // Get the active provider's settings
  async getProviderSettings(provider: AIProvider): Promise<ProviderSettings> {
    if (!this.settings) {
      await this.init();
    }
    
    if (!this.settings) {
      throw new Error('Failed to load settings');
    }
    
    // Handle legacy Ollama settings
    if (provider === AIProvider.Ollama && !this.settings.providers?.ollama) {
      return {
        enabled: true,
        endpoint: this.settings.ollamaEndpoint || 'http://localhost:11434',
        model: this.settings.ollamaModel || this.settings.defaultModel || 'gemma3:4b',
        temperature: this.settings.ollamaTemperature || this.settings.temperature || 0.7
      };
    }
    
    const providerSettings = this.settings.providers?.[provider];
    
    if (!providerSettings) {
      return {
        enabled: provider === AIProvider.Ollama, // Only Ollama is enabled by default
        endpoint: provider === AIProvider.Ollama ? 'http://localhost:11434' : undefined,
        model: this.getDefaultModel(provider),
        temperature: 0.7
      };
    }
    
    return providerSettings;
  }
  
  // Get default model for each provider
  private getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.Ollama:
        return 'gemma3:4b';
      case AIProvider.OpenAI:
        return 'gpt-3.5-turbo';
      case AIProvider.Gemini:
        return 'gemini-pro';
      case AIProvider.Claude:
        return 'claude-3-haiku';
      default:
        return 'gemma3:4b';
    }
  }
  
  // Get currently active provider
  async getActiveProvider(): Promise<AIProvider> {
    if (!this.settings) {
      await this.init();
    }
    return this.activeProvider;
  }
  
  // Set active provider
  async setActiveProvider(provider: AIProvider): Promise<boolean> {
    try {
      if (!this.settings) {
        await this.init();
      }
      
      if (!this.settings) {
        throw new Error('Failed to load settings');
      }
      
      this.activeProvider = provider;
      
      // Update settings
      const updatedSettings = {
        ...this.settings,
        activeProvider: provider
      };
      
      await settingsAPI.updateSettings(updatedSettings);
      this.settings = updatedSettings;
      return true;
    } catch (error) {
      console.error(`Error setting active provider to ${provider}:`, error);
      return false;
    }
  }
  
  // Update provider settings
  async updateProviderSettings(
    provider: AIProvider,
    settings: Partial<ProviderSettings>
  ): Promise<boolean> {
    try {
      if (!this.settings) {
        await this.init();
      }
      
      if (!this.settings) {
        throw new Error('Failed to load settings');
      }
      
      const currentProviderSettings = await this.getProviderSettings(provider);
      
      // Create updated settings object
      const updatedSettings = {
        ...this.settings,
        providers: {
          ...this.settings.providers,
          [provider]: {
            ...currentProviderSettings,
            ...settings,
            enabled: settings.enabled !== undefined ? settings.enabled : currentProviderSettings.enabled
          }
        }
      };
      
      // Handle legacy Ollama settings for backward compatibility
      if (provider === AIProvider.Ollama) {
        updatedSettings.ollamaEndpoint = settings.endpoint || updatedSettings.ollamaEndpoint;
        updatedSettings.ollamaModel = settings.model || updatedSettings.ollamaModel;
        updatedSettings.ollamaTemperature = settings.temperature || updatedSettings.ollamaTemperature;
      }
      
      await settingsAPI.updateSettings(updatedSettings);
      this.settings = updatedSettings;
      return true;
    } catch (error) {
      console.error(`Error updating ${provider} settings:`, error);
      return false;
    }
  }
  
  // Test connection to the specified provider
  async testConnection(provider?: AIProvider): Promise<boolean> {
    const providerToTest = provider || this.activeProvider;
    const providerImpl = await this.getProviderImpl(providerToTest);
    return providerImpl.testConnection();
  }
  
  // Create or get a provider implementation
  async getProviderImpl(provider?: AIProvider): Promise<ProviderInterface> {
    const targetProvider = provider || this.activeProvider;
    
    switch (targetProvider) {
      case AIProvider.Ollama:
        return await this.getOllamaProvider();
      case AIProvider.OpenAI:
        return await this.getOpenAIProvider();
      case AIProvider.Gemini:
        return await this.getGeminiProvider();
      case AIProvider.Claude:
        return await this.getClaudeProvider();
      default:
        return await this.getOllamaProvider();
    }
  }
  
  // Provider-specific implementations
  private async getOllamaProvider(): Promise<ProviderInterface> {
    const settings = await this.getProviderSettings(AIProvider.Ollama);
    
    // Dynamic import to avoid bundling server-side modules
    const { chat, testConnection } = await import('./providers/ollama');
    
    return {
      chat: async (messages: Message[], options?: ChatOptions) => {
        return chat(
          messages,
          {
            ...options,
            model: options?.model || settings.model,
            temperature: options?.temperature ?? settings.temperature,
            endpoint: settings.endpoint
          }
        );
      },
      testConnection: async () => {
        return testConnection(settings.endpoint);
      }
    };
  }
  
  private async getOpenAIProvider(): Promise<ProviderInterface> {
    const settings = await this.getProviderSettings(AIProvider.OpenAI);
    
    // Dynamic import
    const { chat, testConnection } = await import('./providers/openai');
    
    return {
      chat: async (messages: Message[], options?: ChatOptions) => {
        return chat(
          messages,
          {
            ...options,
            model: options?.model || settings.model,
            temperature: options?.temperature ?? settings.temperature,
            apiKey: settings.apiKey,
            endpoint: settings.endpoint
          }
        );
      },
      testConnection: async () => {
        return testConnection(settings.apiKey);
      }
    };
  }
  
  private async getGeminiProvider(): Promise<ProviderInterface> {
    const settings = await this.getProviderSettings(AIProvider.Gemini);
    
    // Dynamic import
    const { chat, testConnection } = await import('./providers/gemini');
    
    return {
      chat: async (messages: Message[], options?: ChatOptions) => {
        return chat(
          messages,
          {
            ...options,
            model: options?.model || settings.model,
            temperature: options?.temperature ?? settings.temperature,
            apiKey: settings.apiKey,
            endpoint: settings.endpoint
          }
        );
      },
      testConnection: async () => {
        return testConnection(settings.apiKey);
      }
    };
  }
  
  private async getClaudeProvider(): Promise<ProviderInterface> {
    const settings = await this.getProviderSettings(AIProvider.Claude);
    
    // Dynamic import
    const { chat, testConnection } = await import('./providers/claude');
    
    return {
      chat: async (messages: Message[], options?: ChatOptions) => {
        return chat(
          messages,
          {
            ...options,
            model: options?.model || settings.model,
            temperature: options?.temperature ?? settings.temperature,
            apiKey: settings.apiKey,
            endpoint: settings.endpoint
          }
        );
      },
      testConnection: async () => {
        return testConnection(settings.apiKey);
      }
    };
  }
  
  // Unified chat method
  async chat(
    messages: Message[],
    options?: ChatOptions
  ): Promise<string> {
    const provider = await this.getProviderImpl();
    return provider.chat(messages, options);
  }
  
  // Generate summary with current provider
  async generateSummary(content: string): Promise<{
    summary: string;
    keyPoints: string[];
  }> {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes content concisely. Provide a brief summary and a list of key points.'
      },
      {
        role: 'user',
        content: `Please summarize the following content and extract 3-5 key points:
        
${content}`
      }
    ];
    
    const result = await this.chat(messages);
    
    // Parse the response
    const summaryMatch = result.match(/(?:Summary|summary):(.*?)(?:Key Points|key points):/i);
    const keyPointsMatch = result.match(/(?:Key Points|key points):(.*)/i);
    
    const summary = summaryMatch && summaryMatch[1] 
      ? summaryMatch[1].trim() 
      : result.substring(0, 200);
      
    let keyPoints: string[] = [];
    
    if (keyPointsMatch && keyPointsMatch[1]) {
      const pointsText = keyPointsMatch[1].trim();
      keyPoints = pointsText
        .split(/\s*[-*•]\s*|\s*\d+\.\s*/)
        .filter(point => point.trim().length > 10)
        .map(point => point.trim());
    }
    
    return {
      summary,
      keyPoints,
    };
  }
}

// Export singleton instance
export const aiManager = new AIManager(); 