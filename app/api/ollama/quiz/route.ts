import { NextRequest, NextResponse } from 'next/server';
import { OllamaService, QuizGenerationRequest } from '@/app/lib/ollama';

/**
 * Generate quiz questions from content using Ollama
 * This endpoint provides quiz question generation using the OllamaService
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.content) {
      return NextResponse.json(
        { status: 'error', message: 'Content is required' },
        { status: 400 }
      );
    }

    // Extract the request data
    const quizRequest: QuizGenerationRequest = {
      content: data.content,
      numberOfQuestions: data.numberOfQuestions || 5,
      options: data.options || {}
    };

    // Create a new instance or use the endpoint from options if provided
    const ollamaEndpoint = data.options?.endpoint || 'http://localhost:11434';
    const ollamaModel = data.options?.model || 'gemma3:4b'; // Use a robust default model
    const ollamaTemp = data.options?.temperature || 0.7;

    // Create an instance of the OllamaService with the provided or default configuration
    const ollamaService = OllamaService.createInstance(ollamaEndpoint, ollamaModel, ollamaTemp);

    // Test connection before attempting to generate quiz
    const connected = await ollamaService.testConnection();
    if (!connected) {
      return NextResponse.json(
        { status: 'error', message: 'Failed to connect to Ollama service' },
        { status: 503 }
      );
    }

    // Call the quiz generation method with the request data
    const quiz = await ollamaService.generateQuiz(quizRequest);

    // Return the quiz
    return NextResponse.json({
      status: 'success',
      data: quiz
    });
  } catch (error: any) {
    console.error('Error in quiz generation API:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Failed to generate quiz questions' },
      { status: 500 }
    );
  }
} 