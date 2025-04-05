import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({
        status: 'error',
        message: 'URL is required'
      }, { status: 400 });
    }
    
    // Check if it's a YouTube URL
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      return extractYouTubeContent(url);
    } else {
      // Extract content from general webpage
      return extractWebpageContent(url);
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to extract content from URL'
    }, { status: 500 });
  }
}

async function extractWebpageContent(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Failed to fetch URL: ${response.statusText}`
      }, { status: response.status });
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header, iframe, .header, .footer, .nav, .sidebar, .ad, .advertisement').remove();
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim();
    
    // Extract main content
    let content = '';
    
    // Try to find the main content container
    const mainSelectors = [
      'article', 
      'main', 
      '.content', 
      '.post-content', 
      '.article-content', 
      '.entry-content', 
      '.main-content',
      '#content',
      '.article'
    ];
    
    let mainContent: cheerio.Cheerio<any> | null = null;
    for (const selector of mainSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        mainContent = elements;
        break;
      }
    }
    
    if (mainContent) {
      // Extract text from the main content
      content = mainContent.text().trim();
    } else {
      // Fallback: extract text from paragraphs
      const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
      content = paragraphs.join('\n\n');
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
      .replace(/\n\s*\n/g, '\n\n')  // Replace multiple newlines with two newlines
      .trim();
    
    // Extract metadata
    const metaData = {
      title,
      content,
      siteName: getSiteName($) || new URL(url).hostname,
      author: getAuthor($),
      publishDate: getPublishDate($),
      description: $('meta[name="description"]').attr('content') || ''
    };
    
    return NextResponse.json({
      status: 'success',
      data: metaData
    });
  } catch (error) {
    console.error('Error extracting webpage content:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to extract webpage content'
    }, { status: 500 });
  }
}

async function extractYouTubeContent(url: string) {
  try {
    // Extract video ID from URL
    let videoId = '';
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    
    if (!videoId) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid YouTube URL'
      }, { status: 400 });
    }
    
    // Fetch video page to extract details
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Failed to fetch YouTube video: ${response.statusText}`
      }, { status: response.status });
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract title and description
    let title = '';
    let description = '';
    let channelName = '';
    
    // Try to extract from meta tags first
    title = $('meta[property="og:title"]').attr('content') || 
           $('meta[name="title"]').attr('content') || '';
    
    description = $('meta[property="og:description"]').attr('content') || 
                 $('meta[name="description"]').attr('content') || '';
    
    channelName = $('meta[property="og:site_name"]').attr('content') || 
                 $('link[itemprop="name"]').attr('content') || '';
    
    // Clean up the extracted data
    title = title.trim();
    description = description.trim();
    channelName = channelName.trim();
    
    // Prepare content from description
    const content = `Video Title: ${title}\n\nChannel: ${channelName}\n\nDescription:\n${description}`;
    
    return NextResponse.json({
      status: 'success',
      data: {
        title,
        content,
        siteName: 'YouTube',
        author: channelName,
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`
      }
    });
  } catch (error) {
    console.error('Error extracting YouTube content:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to extract YouTube video content'
    }, { status: 500 });
  }
}

function getSiteName($: cheerio.CheerioAPI): string {
  return $('meta[property="og:site_name"]').attr('content') || 
         $('meta[name="application-name"]').attr('content') || 
         '';
}

function getAuthor($: cheerio.CheerioAPI): string {
  return $('meta[name="author"]').attr('content') || 
         $('meta[property="article:author"]').attr('content') || 
         $('a[rel="author"]').text() || 
         '';
}

function getPublishDate($: cheerio.CheerioAPI): string {
  return $('meta[property="article:published_time"]').attr('content') || 
         $('meta[name="pubdate"]').attr('content') || 
         $('time[datetime]').attr('datetime') || 
         $('meta[name="date"]').attr('content') || 
         '';
} 