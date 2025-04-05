// Content script for LocalRecall Chrome extension

// This script runs in the context of web pages

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractContent') {
    const content = extractPageContent();
    sendResponse({ content });
    return true;
  }
});

// Function to extract page content
function extractPageContent() {
  // Check if it's a YouTube page
  const isYouTube = window.location.hostname.includes('youtube.com');
  
  if (isYouTube) {
    return extractYouTubeContent();
  } else {
    return extractArticleContent();
  }
}

// Function to extract content from an article/regular webpage
function extractArticleContent() {
  // Try to identify the main content
  const article = document.querySelector('article') || 
                  document.querySelector('main') || 
                  document.querySelector('.content') || 
                  document.querySelector('#content');
  
  const title = document.title;
  const url = window.location.href;
  const content = article ? article.innerText : document.body.innerText;
  const metadata = {
    author: extractAuthor(),
    date: extractPublishDate(),
    siteName: extractSiteName()
  };
  
  return {
    title,
    url,
    content: content.slice(0, 15000), // Limit content length
    metadata,
    contentType: 'article'
  };
}

// Function to extract content from YouTube
function extractYouTubeContent() {
  // Basic extraction for YouTube
  // Note: Full transcript extraction would require more advanced techniques
  const title = document.title.replace(' - YouTube', '');
  const url = window.location.href;
  
  // Try to get video description
  const description = document.querySelector('#description-text')?.textContent || '';
  
  // Attempt to get channel name
  const channelName = document.querySelector('#owner #channel-name')?.textContent || '';
  
  return {
    title,
    url,
    content: description,
    metadata: {
      channelName,
      videoId: extractYouTubeVideoId(url)
    },
    contentType: 'video'
  };
}

// Helper function to extract YouTube video ID
function extractYouTubeVideoId(url) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('v') || '';
}

// Helper function to extract author
function extractAuthor() {
  // Try various common author metadata patterns
  const metaAuthor = document.querySelector('meta[name="author"]')?.content ||
                    document.querySelector('meta[property="article:author"]')?.content;
  
  if (metaAuthor) return metaAuthor;
  
  // Try common author containers
  const authorElem = document.querySelector('.author') || 
                    document.querySelector('.byline') || 
                    document.querySelector('[rel="author"]');
  
  return authorElem ? authorElem.textContent.trim() : '';
}

// Helper function to extract publish date
function extractPublishDate() {
  // Try meta tags first
  const metaDate = document.querySelector('meta[property="article:published_time"]')?.content ||
                  document.querySelector('meta[name="published_date"]')?.content ||
                  document.querySelector('meta[name="date"]')?.content;
  
  if (metaDate) return metaDate;
  
  // Try common date containers
  const dateElem = document.querySelector('.published-date') || 
                  document.querySelector('.post-date') || 
                  document.querySelector('time');
  
  return dateElem ? dateElem.textContent.trim() : '';
}

// Helper function to extract site name
function extractSiteName() {
  // Try meta tags first
  const siteName = document.querySelector('meta[property="og:site_name"]')?.content;
  
  if (siteName) return siteName;
  
  // Fall back to the domain name
  return window.location.hostname.replace('www.', '');
} 