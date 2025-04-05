import { NextRequest, NextResponse } from 'next/server';
import { OllamaService } from '@/app/lib/ollama';

interface ConnectionResult {
  status?: number;
  ok?: boolean;
  statusText?: string;
  error?: string;
  code?: string;
  errno?: number;
  stack?: string;
}

interface DebugInfo {
  timestamp: string;
  environment: string;
  platform: string;
  nodeVersion: string;
  endpoints: string[];
  connectionResults: Record<string, ConnectionResult>;
  networkInterfaces: Record<string, any>;
  osDetails: Record<string, any>;
  networkError?: string;
}

/**
 * Debug endpoint for Ollama connection issues
 * Provides detailed information about connection attempts and network configuration
 */
export async function GET() {
  try {
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      platform: process.platform,
      nodeVersion: process.version,
      endpoints: [],
      connectionResults: {},
      networkInterfaces: {},
      osDetails: {}
    };
    
    // Test multiple endpoints to determine which works
    const endpoints = [
      'http://localhost:11434',
      'http://127.0.0.1:11434',
      'http://0.0.0.0:11434'
    ];
    
    debugInfo.endpoints = endpoints;
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Debug: Testing connection to ${endpoint}`);
        const service = OllamaService.createInstance(endpoint);
        
        // First try the tags endpoint
        try {
          const tagsResponse = await fetch(`${endpoint}/api/tags`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          debugInfo.connectionResults[`${endpoint}/api/tags`] = {
            status: tagsResponse.status,
            ok: tagsResponse.ok,
            statusText: tagsResponse.statusText
          };
        } catch (error: any) {
          debugInfo.connectionResults[`${endpoint}/api/tags`] = {
            error: error.message,
            code: error.code,
            errno: error.errno
          };
        }
        
        // Try the models endpoint
        try {
          const modelsResponse = await fetch(`${endpoint}/api/models`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          debugInfo.connectionResults[`${endpoint}/api/models`] = {
            status: modelsResponse.status,
            ok: modelsResponse.ok,
            statusText: modelsResponse.statusText
          };
        } catch (error: any) {
          debugInfo.connectionResults[`${endpoint}/api/models`] = {
            error: error.message,
            code: error.code,
            errno: error.errno
          };
        }
      } catch (error: any) {
        debugInfo.connectionResults[endpoint] = {
          error: error.message,
          stack: error.stack
        };
      }
    }
    
    // Get OS networking information if available
    try {
      const os = require('os');
      
      debugInfo.networkInterfaces = os.networkInterfaces();
      debugInfo.osDetails = {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        uptime: os.uptime()
      };
    } catch (error: any) {
      debugInfo.networkError = error.message;
    }

    return NextResponse.json({
      status: 'success',
      data: debugInfo
    });
  } catch (error: any) {
    console.error('Error in Ollama debug endpoint:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An error occurred in debug endpoint',
      stack: error.stack
    }, { status: 500 });
  }
} 