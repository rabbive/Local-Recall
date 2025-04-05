import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface OllamaSettingsProps {
  initialEndpoint?: string;
  initialModel?: string;
  onSave?: (endpoint: string, model: string) => void;
}

export default function OllamaSettings({ 
  initialEndpoint = 'http://127.0.0.1:11434', 
  initialModel = 'gemma3:4b',
  onSave 
}: OllamaSettingsProps) {
  const [endpoint, setEndpoint] = useState(initialEndpoint);
  const [model, setModel] = useState(initialModel);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Common endpoints for quick selection
  const commonEndpoints = [
    'http://localhost:11434',
    'http://127.0.0.1:11434',
    'http://host.docker.internal:11434', // For Docker environments
  ];
  
  // Common models
  const commonModels = [
    'gemma3:4b',
    'llama3',
    'llama3:8b',
    'mistral',
    'mixtral',
    'codellama',
    'phi3'
  ];
  
  // Test connection when component mounts or endpoint changes
  useEffect(() => {
    testConnection();
  }, []);
  
  // Test the connection to Ollama
  const testConnection = async (customEndpoint?: string) => {
    const endpointToTest = customEndpoint || endpoint;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ollama/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: endpointToTest })
      });
      
      const data = await response.json();
      setIsConnected(data.status === 'success');
      
      if (data.status === 'success') {
        toast.success('Connected to Ollama! 🎉');
      } else {
        toast.error('Failed to connect to Ollama');
        runDiagnostics();
      }
    } catch (error) {
      console.error('Error testing Ollama connection:', error);
      setIsConnected(false);
      toast.error('Error testing connection');
      runDiagnostics();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run diagnostics to get more information
  const runDiagnostics = async () => {
    try {
      const response = await fetch('/api/ollama/debug');
      const data = await response.json();
      
      if (data.status === 'success') {
        setDebugInfo(data.data);
        setShowDebug(true);
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
    }
  };
  
  // Save the settings
  const saveSettings = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ollama/update-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint, model })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        toast.success('Ollama settings updated');
        if (onSave) onSave(endpoint, model);
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving Ollama settings:', error);
      toast.error('Error saving settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Ollama Connection Settings</h3>
      
      <div className="space-y-4">
        {/* Connection status indicator */}
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Connected to Ollama' : 'Not connected to Ollama'}</span>
        </div>
        
        {/* Endpoint selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Ollama Endpoint</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
              placeholder="http://127.0.0.1:11434"
            />
            <button
              onClick={() => testConnection()}
              disabled={isLoading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              {isLoading ? 'Testing...' : 'Test'}
            </button>
          </div>
          
          {/* Quick endpoint selection */}
          <div className="mt-2 flex flex-wrap gap-2">
            {commonEndpoints.map((ep) => (
              <button
                key={ep}
                onClick={() => {
                  setEndpoint(ep);
                  testConnection(ep);
                }}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {ep}
              </button>
            ))}
          </div>
        </div>
        
        {/* Model selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
              placeholder="gemma3:4b"
            />
          </div>
          
          {/* Quick model selection */}
          <div className="mt-2 flex flex-wrap gap-2">
            {commonModels.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        
        {/* Save button */}
        <div className="mt-4">
          <button
            onClick={saveSettings}
            disabled={isLoading || !isConnected}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={runDiagnostics}
            className="ml-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            Run Diagnostics
          </button>
        </div>
        
        {/* Display debug information if available */}
        {showDebug && debugInfo && (
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Connection Diagnostics</h4>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-auto max-h-60">
              <p className="mb-2 font-medium">Tried connecting to:</p>
              <ul className="list-disc list-inside mb-2">
                {debugInfo.endpoints.map((ep: string, index: number) => (
                  <li key={index}>{ep}</li>
                ))}
              </ul>
              
              <p className="mb-2 font-medium">Connection Results:</p>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(debugInfo.connectionResults, null, 2)}
              </pre>
              
              <div className="mt-4 p-2 bg-yellow-100 dark:bg-yellow-900 rounded-md">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Troubleshooting Tips:</p>
                <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200">
                  <li>Make sure Ollama is running on your machine</li>
                  <li>Try using explicit IP (127.0.0.1) instead of localhost</li>
                  <li>Check if Ollama is running on the default port (11434)</li>
                  <li>Ensure no firewall is blocking the connection</li>
                  <li>If using Docker, try the host.docker.internal endpoint</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowDebug(false)}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400"
            >
              Hide Diagnostics
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 