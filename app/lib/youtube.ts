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
 * Extracts a YouTube video title from a given URL
 * @param videoUrl YouTube video URL
 * @returns Promise with the video title or null if not found
 */
export async function getYouTubeVideoTitle(videoUrl: string): Promise<string | null> {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return null;
    
    // First try: Use oEmbed endpoint (doesn't require API key)
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oEmbedUrl);
      
      if (response.ok) {
        const data = await response.json();
        return data.title || null;
      }
    } catch (error) {
      console.log('Error fetching YouTube title from oEmbed:', error);
    }
    
    // Fallback: Fetch the HTML and extract title (basic scraping)
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      if (response.ok) {
        const html = await response.text();
        
        // Look for title in meta tags
        const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          return titleMatch[1];
        }
        
        // Alternative match
        const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (ogTitleMatch && ogTitleMatch[1]) {
          return ogTitleMatch[1];
        }
      }
    } catch (error) {
      console.log('Error fetching YouTube title from page:', error);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting YouTube video title:', error);
    return null;
  }
} 