import { NextRequest, NextResponse } from 'next/server';
import { OllamaService } from '@/app/lib/ollama';

/**
 * Test connection to Ollama service
 * Returns success or error based on connection status
 */
export async function GET() {
  try {
    // Test default configuration and fallback options
    const endpointsToTry = [
      'http://127.0.0.1:11434',
      'http://localhost:11434',
      'http://0.0.0.0:11434',
      'http://host.docker.internal:11434'
    ];
    
    let successEndpoint = null;
    let workingModel = null;
    
    // Try each endpoint
    for (const endpoint of endpointsToTry) {
      try {
        const ollamaService = new OllamaService(endpoint);
        const connected = await ollamaService.testConnection();
        
        if (connected) {
          successEndpoint = ollamaService.getEndpoint();
          workingModel = ollamaService.getModel();
          break;
        }
      } catch (error) {
        console.error(`Error testing endpoint ${endpoint}:`, error);
        // Continue to next endpoint
      }
    }
    
    if (successEndpoint) {
      return NextResponse.json({
        status: 'success',
        message: 'Connected to Ollama service',
        endpoint: successEndpoint,
        model: workingModel
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to Ollama service',
        triedEndpoints: endpointsToTry
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Error testing Ollama connection:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An error occurred while testing Ollama connection'
    }, { status: 500 });
  }
}

/**
 * Test connection to a custom Ollama endpoint
 * Accepts POST request with endpoint URL to test
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Require endpoint
    if (!data.endpoint) {
      return NextResponse.json({
        status: 'error',
        message: 'Endpoint URL is required'
      }, { status: 400 });
    }
    
    // Create service with custom configuration
    const ollamaService = OllamaService.createInstance(
      data.endpoint,
      data.model || 'gemma3:4b',
      data.temperature || 0.7
    );
    
    // Also try variants of the provided endpoint
    const endpointsToTry = [
      data.endpoint,
      data.endpoint.replace('localhost', '127.0.0.1'),
      data.endpoint.replace('127.0.0.1', 'localhost'),
      // Extract port and try different host combinations
      ...(() => {
        const match = data.endpoint.match(/^https?:\/\/.*?:(\d+)/);
        if (match && match[1]) {
          const port = match[1];
          return [
            `http://127.0.0.1:${port}`,
            `http://localhost:${port}`,
            `http://0.0.0.0:${port}`,
            `http://host.docker.internal:${port}`
          ];
        }
        return [];
      })()
    ];
    
    // Filter unique endpoints
    const uniqueEndpoints = Array.from(new Set(endpointsToTry));
    
    let successEndpoint = null;
    let workingModel = null;
    let lastError: Error | null = null;
    
    // Try each endpoint
    for (const endpoint of uniqueEndpoints) {
      try {
        // Create a service for this specific endpoint
        const testService = OllamaService.createInstance(
          endpoint,
          data.model || 'gemma3:4b'
        );
        
        const connected = await testService.testConnection();
        
        if (connected) {
          successEndpoint = testService.getEndpoint();
          workingModel = testService.getModel();
          break;
        }
      } catch (error) {
        lastError = error as Error;
        // Continue to next endpoint
      }
    }
    
    if (successEndpoint) {
      return NextResponse.json({
        status: 'success',
        message: 'Connected to Ollama service',
        endpoint: successEndpoint,
        model: workingModel,
        testedEndpoints: uniqueEndpoints
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to Ollama service',
        testedEndpoints: uniqueEndpoints,
        error: lastError?.message || 'Unknown connection error'
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Error testing custom Ollama endpoint:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An error occurred while testing Ollama connection'
    }, { status: 500 });
  }
} 