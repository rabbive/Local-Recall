import { ContentType } from './models';
import { extractVideoId, getYouTubeVideoTitle } from './youtube';
import * as cheerio from 'cheerio';

/**
 * Preprocess content based on its type to improve summarization quality
 */
export async function preprocessContent(content: string, title: string, sourceUrl: string | null, contentType: string): Promise<string> {
  // Preprocess based on content type
  if (contentType === ContentType.Video) {
    // For YouTube videos, fetch the actual title if needed
    if (sourceUrl && (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be'))) {
      const videoTitle = await getYouTubeVideoTitle(sourceUrl);
      // Replace title if it contains just "YouTube Video:" or video ID
      if (videoTitle && (title.startsWith('YouTube Video:') || title.includes(extractVideoId(sourceUrl) || ''))) {
        title = videoTitle;
      }
    }
    
    return processVideoContent(content, title);
  } else if (contentType === ContentType.Article) {
    // Clean article content
    return content.trim();
  } else if (contentType === ContentType.PDF) {
    // Clean up PDF content
    return content.trim();
  } else if (contentType === ContentType.Podcast) {
    // Process podcast transcript similar to video
    return processVideoContent(content, title);
  } else if (contentType === ContentType.Website) {
    // Process website content
    return cleanHtml(content);
  } else {
    // Default processing
    return content.trim();
  }
}

/**
 * Process video content specifically, handling YouTube timestamps
 */
export async function processVideoContent(content: string, title: string): Promise<string> {
  // Check if this already has timestamps
  const hasTimestamps = /\[\d{1,2}:\d{2}(:\d{2})?\]/.test(content);
  
  if (hasTimestamps) {
    // Content already has timestamps, return as is
    return content;
  }
  
  // Split content into paragraphs
  const paragraphs = content.split(/\n+/).filter(p => p.trim());
  
  // If there are fewer than 5 paragraphs, it's likely not a transcript
  // Just return as is
  if (paragraphs.length < 5) {
    return content;
  }
  
  // Add artificial timestamps based on paragraph position
  const processedContent = paragraphs.map((paragraph, index) => {
    // Estimate timing (very rough) - assume ~150 words per minute, ~10 words per paragraph
    const minutes = Math.floor((index * 10) / 150);
    const seconds = Math.floor(((index * 10) / 150 - minutes) * 60);
    const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
    
    return `${timestamp} ${paragraph}`;
  }).join('\n\n');
  
  return processedContent;
}

/**
 * Clean HTML from text
 */
function cleanHtml(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $('script, style').remove();
    
    // Extract text, preserving paragraphs
    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .replace(/(\. )/g, '.\n\n')
      .trim();
    
    return text;
  } catch (error) {
    console.error('Error cleaning HTML:', error);
    // If cheerio fails, do basic HTML tag removal
    return html
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Preprocess video transcripts to improve quality
 * - Removes timestamps if present
 * - Merges fragmented sentences
 * - Cleans up speaker indicators
 */
function preprocessVideoTranscript(transcript: string): string {
  // Remove common timestamp formats [00:00] or (00:00)
  let cleaned = transcript.replace(/[\[\(][0-9]{1,2}:[0-9]{2}(:[0-9]{2})?[\]\)]/g, '');
  
  // Remove or standardize speaker indicators
  cleaned = cleaned.replace(/^Speaker [0-9]:?\s*/gm, '');
  cleaned = cleaned.replace(/^[A-Z]+ ?[A-Z]+:?\s*/gm, ''); // JOHN SMITH: format
  
  // Fix common transcript formatting issues
  cleaned = cleaned.replace(/(\w)- /g, '$1'); // Remove hyphenation
  cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Normalize paragraph breaks
  
  // Ensure proper spacing after punctuation
  cleaned = cleaned.replace(/(\.|,|;|:|!|\?)([A-Za-z])/g, '$1 $2');
  
  return cleaned.trim();
}

/**
 * Preprocess articles to improve summarization
 * - Removes boilerplate content
 * - Cleans up formatting
 */
function preprocessArticle(article: string): string {
  // Remove common article boilerplate
  let cleaned = article;
  
  // Remove phrases like "Click to read more" or "Subscribe to our newsletter"
  cleaned = cleaned.replace(/click (here|to) (read|view|download|subscribe).*?\./gi, '');
  cleaned = cleaned.replace(/subscribe to our newsletter.*/gi, '');
  
  // Remove social media sharing text
  cleaned = cleaned.replace(/share (this|on) (twitter|facebook|linkedin).*/gi, '');
  
  // Fix common article formatting issues
  cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Normalize paragraph breaks
  
  return cleaned.trim();
}

/**
 * Preprocess PDF content
 * - Fixes common OCR issues
 * - Removes headers/footers
 */
function preprocessPDF(content: string): string {
  // Basic PDF preprocessing
  let cleaned = content;
  
  // Remove page numbers and common footer/header patterns
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, ''); // Page numbers
  cleaned = cleaned.replace(/^Page \d+ of \d+$/gm, ''); // Page X of Y format
  
  // Fix common OCR issues
  cleaned = cleaned.replace(/([a-z])\.([a-z])/g, '$1. $2'); // Fix sentence boundaries
  cleaned = cleaned.replace(/\f/g, '\n\n'); // Replace form feeds with paragraph breaks
  
  return cleaned.trim();
}

/**
 * Preprocess podcast transcripts
 * - Similar to video but with podcast-specific patterns
 */
function preprocessPodcast(transcript: string): string {
  // Most podcast preprocessing is similar to video
  let cleaned = preprocessVideoTranscript(transcript);
  
  // Additional podcast-specific cleaning
  cleaned = cleaned.replace(/\[music\]|\[intro\]|\[outro\]/gi, '');
  cleaned = cleaned.replace(/\[advertisement\]|\[sponsors?\]|\[ad break\]/gi, '');
  
  return cleaned.trim();
}

/**
 * Preprocess website content
 * - Removes navigation elements
 * - Cleans up HTML artifacts
 */
function preprocessWebsite(content: string): string {
  // Remove HTML tags and artifacts if present
  let cleaned = content.replace(/<[^>]*>/g, ' ');
  
  // Replace HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  
  // Clean up other common website artifacts
  cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Normalize paragraph breaks
  
  // Remove navigation text patterns
  cleaned = cleaned.replace(/home|about|contact|privacy policy|terms of service/gi, '');
  
  return cleaned.trim();
} 