import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeTranscript, fetchBasicMetadata } from '@/app/lib/youtube-transcript';

// Simple in-memory cache for transcripts to reduce API calls
interface CacheEntry {
  transcript: string;
  formattedTranscript: string;
  videoId: string;
  timestamp: number;
}

const transcriptCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Rate limiting state
 */
const ipRequests = new Map<string, { count: number, timestamp: number }>();
const MAX_REQUESTS_PER_MINUTE = 20;

/**
 * Generate a cache key for a video
 */
function generateCacheKey(videoUrl: string, language?: string): string {
  return `${videoUrl}:${language || 'en'}`;
}

/**
 * Check if a user (IP) has exceeded rate limits
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requestState = ipRequests.get(ip) || { count: 0, timestamp: now };
  
  // Reset count if more than a minute has passed
  if (now - requestState.timestamp > 60000) {
    ipRequests.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  // Increment count and check limits
  requestState.count++;
  ipRequests.set(ip, requestState);
  
  return requestState.count > MAX_REQUESTS_PER_MINUTE;
}

/**
 * Clean up expired cache entries periodically
 */
function cleanupCache() {
  const now = Date.now();
  // Use Array.from to convert Map entries to array for compatibility
  Array.from(transcriptCache.entries()).forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_TTL) {
      transcriptCache.delete(key);
    }
  });
}

// Cleanup cache every hour
setInterval(cleanupCache, 3600000);

/**
 * Handle POST requests to extract YouTube transcripts
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limiting
    if (checkRateLimit(ip)) {
      return NextResponse.json({
        status: 'error',
        message: 'Rate limit exceeded. Please try again later.'
      }, { status: 429 });
    }
    
    // Get request data
    const requestData = await request.json();
    const { videoUrl, language = 'en', skipCache = false } = requestData;
    
    if (!videoUrl) {
      return NextResponse.json({
        status: 'error',
        message: 'Video URL is required'
      }, { status: 400 });
    }
    
    // Check cache first (unless skipCache is true)
    const cacheKey = generateCacheKey(videoUrl, language);
    if (!skipCache && transcriptCache.has(cacheKey)) {
      const cachedData = transcriptCache.get(cacheKey);
      
      // Ensure the cache entry isn't expired
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        return NextResponse.json({
          status: 'success',
          data: {
            transcript: cachedData.transcript,
            formattedTranscript: cachedData.formattedTranscript,
            videoId: cachedData.videoId,
            cached: true
          }
        });
      }
    }
    
    // Extract transcript
    const transcriptResult = await extractYouTubeTranscript(videoUrl, language);
    
    if (!transcriptResult.success) {
      return NextResponse.json({
        status: 'error',
        message: transcriptResult.error || 'Failed to extract transcript'
      }, { status: 400 });
    }
    
    // Get basic metadata (thumbnail, etc.)
    let metadata = null;
    if (transcriptResult.videoId) {
      metadata = await fetchBasicMetadata(transcriptResult.videoId);
    }
    
    // Cache the successful result
    if (transcriptResult.transcript && transcriptResult.formattedTranscript && transcriptResult.videoId) {
      transcriptCache.set(cacheKey, {
        transcript: transcriptResult.transcript,
        formattedTranscript: transcriptResult.formattedTranscript,
        videoId: transcriptResult.videoId,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json({
      status: 'success',
      data: {
        transcript: transcriptResult.transcript,
        formattedTranscript: transcriptResult.formattedTranscript,
        videoId: transcriptResult.videoId,
        metadata,
        cached: false
      }
    });
  } catch (error: any) {
    console.error('Error in transcript extraction API:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
} 