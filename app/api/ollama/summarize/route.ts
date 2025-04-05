import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/app/lib/ollama";

// Simple cache for summarization requests
const summaryCache = new Map<string, any>();

interface SummaryResult {
  summary: string;
  detailedSummary: string;
  keyPoints: string[];
}

/**
 * Summarize content using Ollama
 * This endpoint provides content summarization using the OllamaService
 */
export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    const { content, options } = requestData;
    
    if (!content) {
      return NextResponse.json({
        status: 'error',
        message: 'No content provided for summarization'
      }, { status: 400 });
    }
    
    // Create a simple cache key based on content
    const cacheKey = Buffer.from(content).toString('base64').substring(0, 100);
    
    // Check if we have a cached response
    if (summaryCache.has(cacheKey)) {
      return NextResponse.json({
        status: 'success',
        data: summaryCache.get(cacheKey),
        cached: true
      });
    }
    
    // Prepare the prompt for summarization
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes content concisely. Provide a structured summary with a brief overview, detailed explanation, and key points.'
      },
      {
        role: 'user',
        content: `Please summarize the following content and provide it in a structured format with:
        1. A brief summary (2-3 sentences)
        2. A more detailed summary (2-3 paragraphs)
        3. 3-5 key points or takeaways
        
        Content to summarize:
        ${content}`
      }
    ];
    
    // If content looks like a YouTube transcript, use specialized prompt
    if (content.includes('[') && content.includes(']') && content.match(/\[\d+:\d+\]/)) {
      messages[1].content = `Please summarize the following YouTube video transcript and provide:
      1. A brief summary of what the video is about (2-3 sentences)
      2. A more detailed summary breaking down the main sections (2-3 paragraphs)
      3. 4-6 key points or takeaways
      
      Transcript to summarize:
      ${content}`;
    }
    
    // Generate the summary using the ollama service
    const summary = await chat(messages, options);
    
    // Process the response to extract structured data
    const summaryMatch = summary.match(/(?:brief|short|concise)\s+summary:(.*?)(?:detailed|in-depth|more)/i);
    const detailedMatch = summary.match(/(?:detailed|in-depth)\s+summary:(.*?)(?:key|main|important)/i);
    const keyPointsMatch = summary.match(/(?:key|main|important)\s+(?:points|takeaways):(.*)/i);
    
    const result: SummaryResult = {
      summary: summaryMatch && summaryMatch[1] ? summaryMatch[1].trim() : summary.substring(0, 200),
      detailedSummary: detailedMatch && detailedMatch[1] ? detailedMatch[1].trim() : '',
      keyPoints: []
    };
    
    if (keyPointsMatch && keyPointsMatch[1]) {
      const pointsText = keyPointsMatch[1];
      const extractedPoints = pointsText
        .split(/\s*[-*•]\s*|\s*\d+\.\s*/)
        .filter(point => point.trim().length > 10)
        .map(point => point.trim());
      
      if (extractedPoints.length > 0) {
        result.keyPoints = extractedPoints;
      }
    }
    
    // Cache the result
    summaryCache.set(cacheKey, result);
    
    // Limit cache size to prevent memory issues
    if (summaryCache.size > 100) {
      const oldestKey = summaryCache.keys().next().value;
      if (oldestKey) {
        summaryCache.delete(oldestKey);
      }
    }
    
    return NextResponse.json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    console.error('Error in summarization:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to generate summary'
    }, { status: 500 });
  }
}

/**
 * Generate a cache key from content and options
 */
function generateCacheKey(content: string, options?: any): string {
  // Generate a hash of the content (first 100 chars should be enough to identify it)
  // In production, use a proper hashing algorithm
  const contentKey = content.substring(0, 100);
  
  // Include relevant options in the key
  const optionsKey = options ? JSON.stringify({
    model: options.model,
    temperature: options.temperature,
    customPrompt: options.customPrompt
  }) : '';
  
  return `${contentKey}:${optionsKey}`;
} 