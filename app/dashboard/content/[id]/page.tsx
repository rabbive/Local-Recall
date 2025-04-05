'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { KnowledgeCard, ContentType } from '../../../lib/models';
import { knowledgeCardsAPI } from '../../../lib/storage';
import SummaryToggle from '../../../components/SummaryToggle';

// Define interfaces for structured summary data
interface SummaryPoint {
  text: string;
  timestamp: string | null;
}

interface SummaryTopic {
  heading: string;
  points: SummaryPoint[];
}

interface StructuredSummary {
  topics: SummaryTopic[];
}

export default function ContentViewer() {
  const params = useParams();
  const router = useRouter();
  const [summaryMode, setSummaryMode] = useState<'concise' | 'detailed' | 'keypoints'>('concise');
  const [card, setCard] = useState<KnowledgeCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  
  // Fetch the knowledge card data
  useEffect(() => {
    async function fetchCard() {
      try {
        setLoading(true);
        
        // If we have a mock-video ID, use mock data
        if (params.id === 'mock-video') {
          setCard(mockData as any);
          setLoading(false);
          return;
        }
        
        // Try to get the card from client-side storage since API can't access IndexedDB
        try {
          const cardData = await knowledgeCardsAPI.getById(params.id as string);
          if (cardData) {
            setCard(cardData);
            setLoading(false);
            return;
          }
        } catch (storageError) {
          console.error("Error accessing client storage:", storageError);
        }
        
        // Fallback to API (though this may not work if it needs IndexedDB)
        const response = await fetch(`/api/knowledge-cards?id=${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch knowledge card');
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
          setCard(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch knowledge card');
        }
      } catch (error) {
        console.error('Error fetching knowledge card:', error);
        setError('Could not load the content. It may have been deleted or is unavailable.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCard();
  }, [params.id]);
  
  // Regenerate the summary for a knowledge card
  const regenerateSummary = async () => {
    if (!card) return;
    
    try {
      setRegenerating(true);
      
      // Call the Ollama API directly to generate a new summary
      const response = await fetch('/api/ollama/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: card.content,
          options: {
            contentType: card.contentType
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Create updated card with new summary data
        const updatedCard = {
          ...card,
          summary: data.data.summary,
          detailedSummary: data.data.detailedSummary,
          keyPoints: data.data.keyPoints,
          lastSummaryGeneration: new Date()
        };
        
        // Update in client-side storage
        await knowledgeCardsAPI.update(updatedCard);
        
        // Update state
        setCard(updatedCard);
        
        // Show success message
        alert('Summary regenerated successfully');
      } else {
        throw new Error(data.message || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error regenerating summary:', error);
      alert('Failed to regenerate summary. Please try again later.');
    } finally {
      setRegenerating(false);
    }
  };
  
  // Helper function to render video content
  const renderVideoContent = () => {
    if (!card || !card.sourceUrl) return null;
    
    let videoId = '';
    
    // Extract YouTube video ID from URL
    if (card.sourceUrl.includes('youtube.com') || card.sourceUrl.includes('youtu.be')) {
      try {
        if (card.sourceUrl.includes('v=')) {
          videoId = card.sourceUrl.split('v=')[1].split('&')[0];
        } else if (card.sourceUrl.includes('youtu.be/')) {
          videoId = card.sourceUrl.split('youtu.be/')[1].split('?')[0];
        }
      } catch (e) {
        console.error('Error extracting YouTube video ID:', e);
      }
    }
    
    if (videoId) {
      return (
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="relative aspect-video rounded-lg mb-4">
            <iframe 
              className="absolute inset-0 w-full h-full rounded-lg" 
              src={`https://www.youtube.com/embed/${videoId}`} 
              title={card.title}
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render the summary section based on mode
  const renderSummary = () => {
    if (!card) return null;

    const hasEmptySummary = !card.summary && !card.detailedSummary && (!card.keyPoints || card.keyPoints.length === 0);

    if (hasEmptySummary) {
      return (
        <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-md text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No summary available. Click "Regenerate" to create one.
          </p>
        </div>
      );
    }

    const renderConciseSummary = () => {
      if (!card.summary) return null;

      // Try to parse JSON for structured summary - if it fails, display as normal text
      try {
        // Check if the summary is already in JSON format
        let structuredSummary: StructuredSummary | undefined;
        
        if (typeof card.summary === 'string' && (card.summary.trim().startsWith('{') || card.summary.trim().startsWith('['))) {
          try {
            structuredSummary = JSON.parse(card.summary) as StructuredSummary;
          } catch (e) {
            // Not valid JSON, will use text parsing approach
          }
        }

        // If we don't have structured JSON, try to create a structured format from text
        if (!structuredSummary) {
          // Extract topic sections using regex patterns (looks for headings)
          const topicPattern = /^([A-Z][^.!?]*(?:[.!?]|$))\s*(?:\((\d{1,2}:\d{2}(?::\d{2})?)\))?/gm;
          let topics: SummaryTopic[] = [];
          
          // Create a copy of the summary to work with
          const summary = card.summary;
          
          // First try to extract obvious headings
          const headingMatches = summary.match(/(?:^|\n)([A-Z][A-Za-z\s]+(?::|$))/g);
          
          if (headingMatches && headingMatches.length > 1) {
            // Split by headings
            const sections = summary.split(/(?:^|\n)([A-Z][A-Za-z\s]+(?::|$))/g)
              .filter(section => section.trim().length > 0);
            
            // Group heading with content
            for (let i = 0; i < sections.length; i += 2) {
              if (i + 1 < sections.length) {
                const heading = sections[i].replace(/:$/, '').trim();
                const content = sections[i + 1].trim();
                
                // Extract bullet points if they exist
                const points: SummaryPoint[] = content.split(/(?:^|\n)[-•*]\s+/g)
                  .filter(point => point.trim().length > 0)
                  .map(point => {
                    // Try to extract timestamps
                    const timestampMatch = point.match(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/);
                    return {
                      text: point.replace(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/, '').trim(),
                      timestamp: timestampMatch ? timestampMatch[1] : null
                    };
                  });
                
                topics.push({
                  heading,
                  points
                });
              }
            }
          } else {
            // Fallback: Check for timestamps to divide content
            const lines = summary.split('\n').filter(line => line.trim().length > 0);
            let currentHeading = "Summary";
            let currentPoints: SummaryPoint[] = [];
            
            lines.forEach(line => {
              // Check if line looks like a heading (capitalized, ends with colon, no timestamp)
              if (/^[A-Z][a-zA-Z\s]+:$/.test(line.trim())) {
                // Save previous section if it has points
                if (currentPoints.length > 0) {
                  topics.push({
                    heading: currentHeading,
                    points: currentPoints
                  });
                }
                
                currentHeading = line.trim().replace(/:$/, '');
                currentPoints = [];
              } else {
                // Look for timestamp in the line
                const timestampMatch = line.match(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/);
                
                currentPoints.push({
                  text: line.replace(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/, '').trim(),
                  timestamp: timestampMatch ? timestampMatch[1] : null
                });
              }
            });
            
            // Add the last section
            if (currentPoints.length > 0) {
              topics.push({
                heading: currentHeading,
                points: currentPoints
              });
            }
          }
          
          // If we couldn't identify topics, create a single topic with the entire summary
          if (topics.length === 0) {
            topics.push({
              heading: "Summary",
              points: [{
                text: summary,
                timestamp: null
              }]
            });
          }
          
          structuredSummary = { topics };
        }

        // Render the structured summary
        return (
          <div className="space-y-6">
            {structuredSummary.topics ? 
              structuredSummary.topics.map((topic: SummaryTopic, topicIndex: number) => (
                <div key={topicIndex} className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    {topic.heading}
                  </h3>
                  <ul className="space-y-2">
                    {topic.points.map((point: SummaryPoint, pointIndex: number) => (
                      <li key={pointIndex} className="flex items-start space-x-2">
                        <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                        <div className="flex-1">
                          <span className="text-gray-600 dark:text-gray-300">{point.text}</span>
                          {point.timestamp && (
                            <span className="ml-2 text-xs text-blue-500 font-mono">
                              ({point.timestamp})
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            :
              // Fallback for older format
              <div>
                <p className="text-gray-600 dark:text-gray-300">{card.summary}</p>
              </div>
            }
          </div>
        );
      } catch (e) {
        console.error("Error parsing summary:", e);
        // Fallback to simple text display
        return (
          <div>
            <p className="text-gray-600 dark:text-gray-300">{card.summary}</p>
          </div>
        );
      }
    };

    return (
      <div className="space-y-6 py-6">
        <SummaryToggle initialMode={summaryMode} onChange={(mode) => setSummaryMode(mode as any)} />

        {/* Summary content */}
        {summaryMode === 'concise' && (
          <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Concise Summary</h3>
            {renderConciseSummary()}
          </div>
        )}

        {summaryMode === 'detailed' && card.detailedSummary && (
          <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Detailed Summary</h3>
            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {card.detailedSummary}
            </div>
          </div>
        )}

        {summaryMode === 'keypoints' && card.keyPoints && card.keyPoints.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Key Points</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {card.keyPoints.map((point, index) => {
                // Try to extract timestamp if available
                const timestampMatch = point.match(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/);
                const timestamp = timestampMatch ? timestampMatch[1] : null;
                const text = timestampMatch ? point.replace(timestampMatch[0], '').trim() : point;
                
                return (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                    <div className="flex-1">
                      <span>{text}</span>
                      {timestamp && (
                        <span className="ml-2 text-xs text-blue-500 font-mono">
                          ({timestamp})
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !card) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xl mb-4">{error || 'Content not found'}</p>
        <button 
          onClick={() => router.back()} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      ) : card && (
        <div>
          {/* Header with content type and title */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-6">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  {card.contentType}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(card.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{card.title}</h1>
              {card.sourceUrl && (
                <a
                  href={card.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                >
                  {card.sourceName || card.sourceUrl}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              )}
            </div>
            
            {/* Render embedded video if it's a video */}
            {card.contentType === ContentType.Video && card.sourceUrl && (
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="aspect-video w-full">
                  {card.sourceUrl.includes('youtube') && (
                    <>
                      {getYoutubeEmbedUrl(card.sourceUrl) && (
                        <iframe 
                          src={getYoutubeEmbedUrl(card.sourceUrl) || undefined} 
                          className="w-full h-full rounded-md" 
                          title={card.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content and Summary Section - 2 column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transcript Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {card.contentType === ContentType.Video ? 'Video Transcript' : 'Content'}
                  </h2>
                  <button
                    onClick={regenerateSummary}
                    disabled={regenerating}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {regenerating ? 'Regenerating...' : 'Regenerate'}
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                
                <div className="max-h-[70vh] overflow-y-auto">
                  {renderTranscriptWithTimestamps(card.content)}
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    Summary
                  </h2>
                  {renderSummary()}
                </div>

                {/* Tags */}
                {card.tags && card.tags.length > 0 && (
                  <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {card.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data for demonstration, used as fallback
const mockData = {
  title: "Why We Unfairly Scapegoat People (Mimetic Theory Explained)",
  source: "youtube.com",
  tags: [
    { id: "1", name: "Psychology" },
    { id: "2", name: "Desire" }
  ],
  content: "This video explains Mimetic Theory by René Girard and how it relates to scapegoating in society.",
  summary: "Mimetic Theory, explained by René Girard, explores how humans copy desires from others rather than forming them independently. The video examines why we scapegoat others and how desires can destabilize society when left unchecked.",
  keyPoints: [
    "People have various desires in life, such as a stable job, happy marriage, and freedom to travel, but these desires may be influenced by others",
    "The real issue that drives people is the desire to belong, which is explained by Renee Girard's philosophy on the psychology of desire",
    "Girard's work explores how desires can destroy society and what mechanisms are in place to keep these desires in check",
    "All human desire is mimetic, meaning it is copied from others, and the objects of desire are not as important as the people who influence our wants",
    "People copy desires from models, or influential figures, and this can lead to rivalries and violence",
    "The desire for an object is often driven by the desire to be like someone else, and the object itself is temporary and unimportant"
  ],
  sourceUrl: "https://www.youtube.com/watch?v=dLqMnyVd7xI",
  sourceName: "youtube.com",
  contentType: "video",
  id: "mock-video",
  createdAt: new Date(),
  updatedAt: new Date()
};

// Helper function to extract YouTube video embed URL
function getYoutubeEmbedUrl(url: string): string | null {
  let videoId = '';
  
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v') || '';
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  }
  
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

// Function to render transcript with timestamps
function renderTranscriptWithTimestamps(content: string): React.ReactNode {
  // Try to identify timestamps in the content
  // This regex looks for patterns like [00:00], (00:00), 00:00 -
  const timestampRegex = /[\[\(]?(\d{1,2}:\d{2}(?::\d{2})?)[\]\)]?\s*-?\s*/g;
  
  // If no timestamps, create artificial timestamps every 30 seconds
  if (!content.match(timestampRegex)) {
    // Split content into paragraphs
    const paragraphs = content.split(/\n+/).filter(p => p.trim());
    const totalParagraphs = paragraphs.length;
    
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => {
          // Create artificial timestamp (rough approximation)
          const minutes = Math.floor((index * 30) / 60);
          const seconds = (index * 30) % 60;
          const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          return (
            <div key={index} className="flex gap-3">
              <div className="min-w-16 text-blue-600 dark:text-blue-400 font-mono">
                [{timestamp}]
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                {paragraph}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // If timestamps exist, use them to format the transcript
  const segments: {timestamp: string, text: string}[] = [];
  let lastIndex = 0;
  let match;
  
  const contentCopy = content.slice();
  let remaining = contentCopy;
  
  while ((match = timestampRegex.exec(remaining)) !== null) {
    const fullMatch = match[0];
    const timestamp = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    
    // If this isn't the first match, add the text from last match to this one
    if (lastIndex > 0) {
      const segmentText = remaining.substring(lastIndex, startIndex).trim();
      if (segmentText) {
        segments.push({
          timestamp: segments[segments.length - 1].timestamp,
          text: segmentText
        });
      }
    }
    
    // Start a new segment
    segments.push({
      timestamp,
      text: ''
    });
    
    lastIndex = endIndex;
  }
  
  // Add the final segment
  if (lastIndex < remaining.length) {
    const finalText = remaining.substring(lastIndex).trim();
    if (finalText && segments.length > 0) {
      segments.push({
        timestamp: segments[segments.length - 1].timestamp,
        text: finalText
      });
    }
  }
  
  // Render the segments
  return (
    <div className="space-y-4">
      {segments.length > 0 ? (
        segments.map((segment, index) => (
          <div key={index} className="flex gap-3">
            <div className="min-w-16 text-blue-600 dark:text-blue-400 font-mono">
              [{segment.timestamp}]
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              {segment.text || "..."}
            </div>
          </div>
        ))
      ) : (
        // Fallback to display the content as is if no segments could be parsed
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
} 