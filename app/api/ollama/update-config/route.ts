import { NextRequest, NextResponse } from 'next/server';
import { updateConfig, testConnection } from '@/app/lib/ollama';

/**
 * Update Ollama configuration
 * This endpoint allows updating the endpoint, model, and temperature settings
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { endpoint, model, temperature } = data;
    
    // Check for required parameters
    if (!endpoint && !model && temperature === undefined) {
      return NextResponse.json({
        status: 'error',
        message: 'At least one configuration parameter (endpoint, model, or temperature) is required'
      }, { status: 400 });
    }
    
    // Test connection if endpoint is provided
    if (endpoint) {
      const connectionOk = await testConnection(endpoint);
      if (!connectionOk) {
        return NextResponse.json({
          status: 'error',
          message: 'Failed to connect to specified Ollama endpoint'
        }, { status: 400 });
      }
    }
    
    // Update configuration
    const updated = await updateConfig({
      endpoint,
      model,
      temperature: temperature !== undefined ? parseFloat(temperature) : undefined
    });
    
    if (!updated) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to update configuration'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Configuration updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating Ollama configuration:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
} 