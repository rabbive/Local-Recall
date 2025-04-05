import { YoutubeTranscript, TranscriptResponse as YTTranscriptResponse } from 'youtube-transcript';

export interface TranscriptSegment {
  text: string;
  offset: number; // in milliseconds
  duration: number; // in milliseconds
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  formattedTranscript?: string; // Transcript with timestamps
  segments?: TranscriptSegment[];
  videoId?: string;
  error?: string;
  metadata?: {
    title?: string;
    channelName?: string;
    language?: string;
  };
}

export interface VideoMetadata {
  title?: string;
  channelName?: string;
  publishDate?: string;
  videoUrl: string;
  videoId: string;
  thumbnailUrl?: string;
}

/**
 * Extract a video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle youtu.be format
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0];
    return id || null;
  }
  
  // Handle youtube.com formats
  if (url.includes('youtube.com/')) {
    // Handle watch URLs
    if (url.includes('v=')) {
      const id = url.split('v=')[1].split('&')[0];
      return id || null;
    }
    
    // Handle embed URLs
    if (url.includes('/embed/')) {
      const id = url.split('/embed/')[1].split('?')[0];
      return id || null;
    }
    
    // Handle shorts URLs
    if (url.includes('/shorts/')) {
      const id = url.split('/shorts/')[1].split('?')[0];
      return id || null;
    }
  }
  
  // If the input itself looks like a video ID (11 chars, alphanumeric plus some special chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  return null;
}

/**
 * Format a timestamp from seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format transcript with timestamps at appropriate intervals
 */
export function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) {
    return '';
  }
  
  let formattedTranscript = '';
  // Add timestamp every few segments to avoid overcrowding
  const timestampInterval = Math.max(1, Math.floor(segments.length / 20));
  
  segments.forEach((segment, index) => {
    // Add timestamp at intervals or paragraph breaks
    if (index % timestampInterval === 0 || (index > 0 && segments[index-1].text.endsWith('.'))) {
      const timestamp = formatTimestamp(segment.offset / 1000);
      formattedTranscript += `[${timestamp}] `;
    }
    
    formattedTranscript += segment.text + ' ';
    
    // Add newlines between paragraphs for readability
    if (segment.text.endsWith('.') || segment.text.endsWith('!') || segment.text.endsWith('?')) {
      formattedTranscript += '\n\n';
    }
  });
  
  return formattedTranscript.trim();
}

/**
 * Create a plain text transcript from segments
 */
export function createPlainTranscript(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) {
    return '';
  }
  
  return segments.map(segment => segment.text).join(' ');
}

/**
 * Extract transcript from YouTube video
 */
export async function extractYouTubeTranscript(videoUrl: string, preferredLang = 'en'): Promise<TranscriptResponse> {
  try {
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube URL or video ID'
      };
    }
    
    // Use youtube-transcript API to extract transcript
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: preferredLang
    });
    
    if (!transcriptResponse || transcriptResponse.length === 0) {
      return {
        success: false,
        error: 'No transcript available for this video'
      };
    }
    
    // Convert API response to our segment format
    const segments: TranscriptSegment[] = transcriptResponse.map((item: YTTranscriptResponse) => ({
      text: item.text,
      offset: item.offset,
      duration: item.duration
    }));
    
    // Create formatted transcript with timestamps
    const formattedTranscript = formatTranscriptWithTimestamps(segments);
    
    // Create plain text transcript
    const transcript = createPlainTranscript(segments);
    
    return {
      success: true,
      transcript,
      formattedTranscript,
      segments,
      videoId
    };
  } catch (error: any) {
    console.error('Error extracting YouTube transcript:', error);
    
    // Provide detailed error messages
    let errorMessage = 'Failed to extract transcript';
    
    if (error.message) {
      if (error.message.includes('Could not find any transcripts')) {
        errorMessage = 'This video does not have captions available';
      } else if (error.message.includes('Video unavailable')) {
        errorMessage = 'This video is unavailable or private';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'YouTube API rate limit exceeded. Please try again later';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Fetch video metadata (as much as possible without YouTube API)
 * Note: For full metadata, the YouTube Data API would be required
 */
export async function fetchBasicMetadata(videoId: string): Promise<VideoMetadata | null> {
  if (!videoId) return null;
  
  try {
    // We're using a simple approach just to get a thumbnail
    // This is not a complete metadata solution, which would require the YouTube Data API
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
    
    return {
      videoId,
      videoUrl,
      thumbnailUrl
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
} 