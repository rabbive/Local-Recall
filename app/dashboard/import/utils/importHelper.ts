import { knowledgeCardsAPI } from '@/app/lib/storage';
import { ContentType, KnowledgeCard } from '@/app/lib/models';

interface ImportOptions {
  summarize?: boolean;
  model?: string;
  temperature?: number;
  tags?: Array<{id: string; name: string}>;
  summary?: string;
  detailedSummary?: string;
  keyPoints?: string[];
}

/**
 * Import content by preparing it on the server and then storing it on the client
 */
export async function importContent(
  title: string, 
  content: string, 
  contentType: ContentType = ContentType.Note,
  sourceUrl: string = '',
  sourceName: string = '',
  options: ImportOptions = {}
): Promise<KnowledgeCard> {
  try {
    // Step 1: Prepare the card on the server (summarization, etc.)
    const response = await fetch('/api/knowledge-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        contentType,
        sourceUrl,
        sourceName,
        tags: options.tags || [],
        summarize: options.summarize || false,
        summary: options.summary,
        detailedSummary: options.detailedSummary,
        keyPoints: options.keyPoints,
        options: {
          model: options.model,
          temperature: options.temperature
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to prepare knowledge card');
    }
    
    const responseData = await response.json();
    
    if (responseData.status !== 'success') {
      throw new Error(responseData.message || 'Failed to prepare knowledge card');
    }
    
    // Step 2: Store the prepared card in client-side IndexedDB
    const preparedCard = responseData.data as KnowledgeCard;
    const storedCard = await knowledgeCardsAPI.add(preparedCard);
    
    return storedCard;
  } catch (error) {
    console.error('Error importing content:', error);
    throw error;
  }
} 