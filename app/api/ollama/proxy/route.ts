import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy API to forward requests to Ollama from browser
 * This is necessary because browsers can't directly connect to localhost from a different origin
 */
export async function POST(request: NextRequest) {
  try {
    const { endpoint, path, method = 'GET', body, timeout = 10000 } = await request.json();

    if (!endpoint || !path) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required parameters' }, 
        { status: 400 }
      );
    }

    // Construct the full URL
    const url = `${endpoint}${path}`;
    
    console.log(`Ollama proxy forwarding to: ${method} ${url}`);
    
    // Set up request options with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    };
    
    // Add body for non-GET requests if provided
    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }
    
    // Try multiple endpoints if the provided one fails
    const tryEndpoints = [
      url,
      url.replace('localhost', '127.0.0.1'),
      url.replace(/^http:\/\/.*?:11434/, 'http://127.0.0.1:11434')
    ].filter((value, index, self) => self.indexOf(value) === index);
    
    let lastError: any = null;
    
    // Try each endpoint until one works
    for (const currentUrl of tryEndpoints) {
      try {
        // Make the request to Ollama
        const response = await fetch(currentUrl, options);
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          lastError = {
            status: response.status,
            statusText: response.statusText,
            details: await response.text()
          };
          continue; // Try next endpoint
        }
        
        // Get the response
        const responseData = await (
          response.headers.get('content-type')?.includes('application/json') 
            ? response.json() 
            : response.text()
        );
        
        // Return the response with the working endpoint
        return NextResponse.json({ 
          status: 'success', 
          data: responseData,
          endpoint: currentUrl.split('/api/')[0] // Return the working base endpoint
        });
      } catch (error: any) {
        lastError = error;
        console.error(`Error connecting to ${currentUrl}:`, error);
        // Continue to next endpoint
      }
    }
    
    // If we got here, all endpoints failed
    return NextResponse.json(
      { 
        status: 'error', 
        message: `Failed to connect to Ollama service`,
        details: lastError?.message || 'Unknown error',
        tried: tryEndpoints
      }, 
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Error in Ollama proxy:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Unknown error in Ollama proxy' },
      { status: 500 }
    );
  }
} 