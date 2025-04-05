import { NextRequest, NextResponse } from 'next/server';
import { ContentType, KnowledgeCard } from '../../lib/models';
import { OllamaService } from '../../lib/ollama';
import { preprocessContent } from '../../lib/content-processors';

// Create a server-side instance of OllamaService
const ollamaService = new OllamaService();

// This API is meant to be called from client-side code where IndexedDB is available
// We'll handle JSON operations and let the client handle storage

export async function GET(request: NextRequest) {
  try {
    // This endpoint should be called from client side where IndexedDB is accessible
    // We cannot access IndexedDB from server API routes
    return NextResponse.json({
      status: 'error',
      message: 'This API endpoint cannot access browser storage directly. Please use client-side code to fetch data from IndexedDB.'
    }, { status: 400 });
  } catch (error) {
    console.error('Error in knowledge cards GET route:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.content) {
      return NextResponse.json({
        status: 'error',
        message: 'Title and content are required'
      }, { status: 400 });
    }
    
    // Convert contentType string to enum if needed
    let contentType = body.contentType;
    if (typeof contentType === 'string') {
      contentType = contentType as ContentType;
    }

    // Preprocess content based on its type (clean up transcripts, format articles, etc.)
    const processedContent = await preprocessContent(body.content, contentType);
    
    // Create new card with basic data
    const newCard: Partial<KnowledgeCard> = {
      id: crypto.randomUUID(),
      title: body.title,
      content: processedContent, // Use processed content
      sourceUrl: body.sourceUrl || '',
      sourceName: body.sourceName || '',
      contentType: contentType || ContentType.Note,
      tags: body.tags || [],
      summary: '',
      detailedSummary: '',
      keyPoints: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSummaryGeneration: null, // Track when summary was last generated
    };
    
    // Generate summary if requested
    if (body.summarize) {
      try {
        console.log('Generating summary using Ollama...');
        
        const options = body.options || {};
        
        // Use a custom prompt based on content type if specified
        const customPrompt = body.customPrompt || (
          contentType === ContentType.Video ? 'video_transcript' :
          contentType === ContentType.Article ? 'article' :
          undefined
        );
        
        const summaryResult = await ollamaService.summarize({
          content: processedContent, // Use processed content
          options: {
            ...options,
            customPrompt
          }
        });
        
        // Add summary, detailed summary, and key points to the card
        newCard.summary = summaryResult.summary;
        newCard.detailedSummary = summaryResult.detailedSummary;
        newCard.keyPoints = summaryResult.keyPoints;
        newCard.lastSummaryGeneration = new Date();
        
        console.log('Summary generated successfully');
      } catch (summaryError) {
        console.error('Error generating summary:', summaryError);
        // Continue without summary if summarization fails
        newCard.summary = 'Summary generation failed. You can edit this card to add a summary manually.';
        newCard.detailedSummary = '';
        newCard.keyPoints = [];
      }
    }
    
    // Return the prepared card to be stored by client
    return NextResponse.json({
      status: 'success',
      message: 'Knowledge card prepared successfully',
      data: newCard
    });
  } catch (error) {
    console.error('Error preparing knowledge card:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to prepare knowledge card',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Similar pattern to POST - API routes can't use IndexedDB directly
  return NextResponse.json({
    status: 'error',
    message: 'This API endpoint cannot access browser storage directly. Please use client-side code to update data in IndexedDB.'
  }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  // Similar pattern to POST - API routes can't use IndexedDB directly
  return NextResponse.json({
    status: 'error',
    message: 'This API endpoint cannot access browser storage directly. Please use client-side code to delete data from IndexedDB.'
  }, { status: 400 });
} 