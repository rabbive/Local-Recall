'use client';

import React, { useState, useEffect } from 'react';
import { AIProvider, UserSettings } from '@/app/lib/models';
import { settingsAPI } from '@/app/lib/storage';
import { aiManager } from '@/app/lib/ai-manager';
import { AlertCircle, CheckCircle, CloudOff } from 'lucide-react';

export default function AISettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState<AIProvider>(AIProvider.Ollama);
  const [connectionStatus, setConnectionStatus] = useState<{
    [key in AIProvider]?: { connected: boolean; testing: boolean; error?: string }
  }>({});
  
  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await settingsAPI.getSettings();
        setSettings(userSettings);
        setActiveTab(userSettings.activeProvider || AIProvider.Ollama);
        
        // Test connection to the active provider
        if (userSettings.activeProvider) {
          testConnection(userSettings.activeProvider);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Test connection to a provider
  const testConnection = async (provider: AIProvider) => {
    setConnectionStatus(prev => ({
      ...prev,
      [provider]: { ...prev[provider], testing: true }
    }));
    
    try {
      const isConnected = await aiManager.testConnection(provider);
      
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: { 
          connected: isConnected, 
          testing: false,
          error: isConnected ? undefined : 'Could not connect to provider'
        }
      }));
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: { 
          connected: false, 
          testing: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };
  
  // Save settings
  const saveSettings = async (provider: AIProvider, updatedSettings: any) => {
    if (!settings) return;
    
    try {
      await aiManager.updateProviderSettings(provider, updatedSettings);
      
      // Refresh settings
      const newSettings = await settingsAPI.getSettings();
      setSettings(newSettings);
      
      // Test connection if endpoint or API key changed
      if (updatedSettings.endpoint || updatedSettings.apiKey) {
        testConnection(provider);
      }
    } catch (error) {
      console.error(`Error saving ${provider} settings:`, error);
    }
  };
  
  // Set active provider
  const setActiveProvider = async (provider: AIProvider) => {
    if (!settings) return;
    
    try {
      await aiManager.setActiveProvider(provider);
      
      // Refresh settings
      const newSettings = await settingsAPI.getSettings();
      setSettings(newSettings);
    } catch (error) {
      console.error(`Error setting active provider to ${provider}:`, error);
    }
  };
  
  if (!settings) {
    return <div className="p-4">Loading settings...</div>;
  }
  
  // Get provider-specific settings
  const getProviderSettings = (provider: AIProvider) => {
    // Handle legacy Ollama settings for backward compatibility
    if (provider === AIProvider.Ollama && !settings.providers?.ollama) {
      return {
        enabled: true,
        endpoint: settings.ollamaEndpoint || 'http://localhost:11434',
        model: settings.ollamaModel || settings.defaultModel || 'gemma3:4b',
        temperature: settings.ollamaTemperature || settings.temperature || 0.7
      };
    }
    
    return settings.providers?.[provider] || {
      enabled: provider === AIProvider.Ollama,
      endpoint: provider === AIProvider.Ollama ? 'http://localhost:11434' : undefined,
      model: getDefaultModel(provider),
      temperature: 0.7
    };
  };
  
  // Get default model for each provider
  const getDefaultModel = (provider: AIProvider): string => {
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
  };
  
  // Get provider-specific models
  const getProviderModels = (provider: AIProvider): { value: string; label: string }[] => {
    switch (provider) {
      case AIProvider.Ollama:
        return [
          { value: 'gemma:2b', label: 'Gemma 2B' },
          { value: 'gemma:7b', label: 'Gemma 7B' },
          { value: 'gemma3:4b', label: 'Gemma3 4B' },
          { value: 'llama3:8b', label: 'Llama3 8B' },
          { value: 'llama3:70b', label: 'Llama3 70B' },
          { value: 'mistral', label: 'Mistral 7B' },
          { value: 'mixtral', label: 'Mixtral 8x7B' },
          { value: 'phi3:3.8b', label: 'Phi-3 3.8B' },
          { value: 'phi3:14b', label: 'Phi-3 14B' }
        ];
      case AIProvider.OpenAI:
        return [
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-4o', label: 'GPT-4o' }
        ];
      case AIProvider.Gemini:
        return [
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
        ];
      case AIProvider.Claude:
        return [
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-opus', label: 'Claude 3 Opus' }
        ];
      default:
        return [];
    }
  };
  
  // Get connection status icon
  const getConnectionIcon = (provider: AIProvider) => {
    const status = connectionStatus[provider];
    
    if (!status) {
      return <CloudOff className="w-5 h-5 text-gray-400" />;
    }
    
    if (status.testing) {
      return <div className="w-5 h-5 border-2 border-t-blue-500 rounded-full animate-spin" />;
    }
    
    if (status.connected) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };
  
  const providerData = [
    { id: AIProvider.Ollama, name: 'Ollama', description: 'Local large language models' },
    { id: AIProvider.OpenAI, name: 'OpenAI', description: 'GPT-3.5 and GPT-4 models' },
    { id: AIProvider.Gemini, name: 'Gemini', description: 'Google AI models' },
    { id: AIProvider.Claude, name: 'Claude', description: 'Anthropic AI models' }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Provider Settings</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Currently using:</span>
          <span className="px-2 py-1 text-sm font-medium border rounded-full">
            {providerData.find(p => p.id === settings.activeProvider)?.name || 'Ollama'}
          </span>
        </div>
      </div>
      
      {/* Tabs navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {providerData.map(provider => (
            <button
              key={provider.id}
              className={`py-2 px-4 font-medium text-sm relative ${
                activeTab === provider.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(provider.id as AIProvider)}
            >
              {provider.name}
              <span className="absolute -top-1 -right-1">
                {getConnectionIcon(provider.id as AIProvider)}
              </span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab content */}
      {providerData.map(provider => {
        const providerId = provider.id as AIProvider;
        const providerSettings = getProviderSettings(providerId);
        const status = connectionStatus[providerId];
        
        if (activeTab !== providerId) return null;
        
        return (
          <div key={providerId} className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">{provider.name}</h3>
              <p className="text-sm text-gray-500">{provider.description}</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${providerId}-enabled`}
                    checked={providerSettings.enabled}
                    onChange={(e) => {
                      saveSettings(providerId, { enabled: e.target.checked });
                    }}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor={`${providerId}-enabled`} className="text-sm">Enabled</label>
                </div>
                
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    settings.activeProvider === providerId
                      ? 'bg-blue-100 text-blue-800'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveProvider(providerId)}
                  disabled={!providerSettings.enabled || settings.activeProvider === providerId}
                >
                  {settings.activeProvider === providerId ? "Current Provider" : "Set as Active"}
                </button>
              </div>
              
              {providerId === AIProvider.Ollama && (
                <div className="space-y-2">
                  <label htmlFor="ollama-endpoint" className="block text-sm font-medium text-gray-700">
                    Endpoint URL
                  </label>
                  <input
                    id="ollama-endpoint"
                    type="text"
                    value={providerSettings.endpoint || ''}
                    onChange={(e) => {
                      saveSettings(providerId, { endpoint: e.target.value });
                    }}
                    placeholder="http://localhost:11434"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              
              {(providerId === AIProvider.OpenAI || providerId === AIProvider.Gemini || providerId === AIProvider.Claude) && (
                <div className="space-y-2">
                  <label htmlFor={`${providerId}-api-key`} className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <input
                    id={`${providerId}-api-key`}
                    type="password"
                    value={providerSettings.apiKey || ''}
                    onChange={(e) => {
                      saveSettings(providerId, { apiKey: e.target.value });
                    }}
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    {providerId === AIProvider.OpenAI && "Get your API key from https://platform.openai.com/account/api-keys"}
                    {providerId === AIProvider.Gemini && "Get your API key from https://aistudio.google.com/app/apikey"}
                    {providerId === AIProvider.Claude && "Get your API key from https://console.anthropic.com/settings/keys"}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor={`${providerId}-model`} className="block text-sm font-medium text-gray-700">
                  Model
                </label>
                <select
                  id={`${providerId}-model`}
                  value={providerSettings.model || getDefaultModel(providerId)}
                  onChange={(e) => {
                    saveSettings(providerId, { model: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {getProviderModels(providerId).map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`${providerId}-temperature`} className="block text-sm font-medium text-gray-700">
                    Temperature: {providerSettings.temperature}
                  </label>
                </div>
                <input
                  id={`${providerId}-temperature`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={providerSettings.temperature || 0.7}
                  onChange={(e) => {
                    saveSettings(providerId, { temperature: parseFloat(e.target.value) });
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => testConnection(providerId)}
                  disabled={connectionStatus[providerId]?.testing}
                >
                  {connectionStatus[providerId]?.testing ? 'Testing Connection...' : 'Test Connection'}
                </button>
                
                {status && (
                  <div className={`mt-2 text-sm ${status.connected ? 'text-green-500' : 'text-red-500'}`}>
                    {status.connected 
                      ? 'Successfully connected' 
                      : `Connection failed: ${status.error || 'Unknown error'}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 