import { ContentType } from '@/app/lib/models';
import { preprocessContent } from '@/app/lib/content-processors';
import { getYouTubeVideoTitle } from '@/app/lib/youtube';

// Process the content before saving
// Update the processContent function to use the enhanced preprocessContent
async function processContent(content: string, title: string, sourceUrl: string | null, contentType: ContentType): Promise<{ processedContent: string, updatedTitle: string }> {
  try {
    // For YouTube videos, fetch actual title if needed
    let updatedTitle = title;
    
    // Preprocess the content based on its type
    const processedContent = await preprocessContent(content, updatedTitle, sourceUrl, contentType);
    
    return { 
      processedContent,
      updatedTitle
    };
  } catch (error) {
    console.error('Error processing content:', error);
    return { 
      processedContent: content,
      updatedTitle: title
    };
  }
} 