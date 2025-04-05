import { NextRequest, NextResponse } from 'next/server';
import { OllamaService } from '@/app/lib/ollama';

/**
 * Extract tags from content using NLP
 * This endpoint analyzes content and extracts relevant keywords as tags
 */
export async function POST(request: NextRequest) {
  try {
    const { content, contentType, title, url } = await request.json();

    if (!content) {
      return NextResponse.json(
        { status: 'error', message: 'Content is required' },
        { status: 400 }
      );
    }

    // Create a service instance
    const ollamaService = new OllamaService();

    // Test connection before attempting to extract tags
    const connected = await ollamaService.testConnection();
    if (!connected) {
      return NextResponse.json(
        { status: 'error', message: 'Failed to connect to Ollama service' },
        { status: 503 }
      );
    }

    // Create a prompt for tag extraction
    const combinedContent = [
      title ? `Title: ${title}` : '',
      url ? `URL: ${url}` : '',
      `Content type: ${contentType || 'text'}`,
      `Content: ${content.substring(0, 2000)}...` // Limit content size
    ].filter(Boolean).join('\n\n');

    const promptTemplate = `
      You are an expert at extracting relevant tags/keywords from content.
      Analyze the following content and extract 3-7 relevant tags.
      Tags should be 1-3 words, lowercase, and relevant to the key topics.
      
      Return ONLY a JSON array of tag strings, nothing else.
      Example: ["machine learning", "python", "data science"]
      
      Here is the content to analyze:
      ${combinedContent}
    `;

    // Call the language model to extract tags
    const response = await fetch(`${ollamaService.getEndpoint()}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaService.getModel(),
        prompt: promptTemplate,
        temperature: 0.1, // Low temperature for more deterministic results
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to extract tags: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the JSON array from the response
    try {
      // Find JSON array in the response
      const match = data.response.match(/\[[\s\S]*\]/);
      let tags = [];
      
      if (match) {
        tags = JSON.parse(match[0]);
      } else {
        // Fallback: extract words that look like tags
        tags = data.response
          .split(/[,\n]/)
          .map((item: string) => item.trim().toLowerCase())
          .filter((item: string) => 
            item.length > 0 && 
            !item.includes('[') && 
            !item.includes(']') &&
            !item.includes('{') &&
            !item.includes('}')
          )
          .map((tag: string) => tag.replace(/^["'](.+)["']$/, '$1')) // Remove quotes
          .slice(0, 7); // Limit to 7 tags
      }
      
      // Make sure we return an array of strings
      const cleanTags = tags
        .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.toLowerCase())
        .slice(0, 7); // Ensure max 7 tags
        
      return NextResponse.json({
        status: 'success',
        data: {
          tags: cleanTags
        }
      });
    } catch (parseError) {
      console.error('Error parsing tag extraction response:', parseError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse extracted tags',
        data: {
          rawResponse: data.response
        }
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in tag extraction endpoint:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to extract tags from content'
    }, { status: 500 });
  }
} 