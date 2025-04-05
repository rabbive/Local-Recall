'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { extractVideoId } from '@/app/lib/youtube-transcript';
import { ContentType } from '@/app/lib/models';
import { knowledgeCardsAPI } from '@/app/lib/storage';

interface YouTubeImporterProps {
  onImportComplete?: (cardId: string) => void;
}

export default function YouTubeImporter({ onImportComplete }: YouTubeImporterProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [formattedTranscript, setFormattedTranscript] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Extract transcript from YouTube video
  const extractTranscript = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    // Simple URL validation
    if (!extractVideoId(videoUrl)) {
      setError('Invalid YouTube URL');
      return;
    }
    
    try {
      setIsExtracting(true);
      setError(null);
      
      const response = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl: videoUrl.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'error') {
        setError(data.message || 'Failed to extract transcript');
        return;
      }
      
      // Set transcript data
      setTranscript(data.data.transcript);
      setFormattedTranscript(data.data.formattedTranscript);
      setVideoId(data.data.videoId);
      
      // Set metadata if available
      if (data.data.metadata) {
        setThumbnailUrl(data.data.metadata.thumbnailUrl);
        // Default title from video ID if not available
        setVideoTitle(data.data.metadata.title || `YouTube Video (${data.data.videoId})`);
      } else {
        setVideoTitle(`YouTube Video (${data.data.videoId})`);
      }
      
      toast.success('Transcript extracted successfully!');
    } catch (err: any) {
      console.error('Error extracting transcript:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsExtracting(false);
    }
  };
  
  // Save transcript to knowledge base
  const saveTranscript = async () => {
    if (!formattedTranscript || !videoId) {
      setError('No transcript data available');
      return;
    }
    
    try {
      setIsImporting(true);
      
      // Create a new knowledge card
      const newCard = {
        title: videoTitle || `YouTube Video (${videoId})`,
        content: formattedTranscript,
        contentType: ContentType.Video,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sourceName: 'YouTube',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // First, generate summary via Ollama
      let summary = null;
      let detailedSummary = null;
      let keyPoints = null;
      
      try {
        const summaryResponse = await fetch('/api/ollama/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: formattedTranscript,
            options: {
              // Pass metadata to include in context
              customPrompt: `Summarize this YouTube video transcript. The video title is "${videoTitle}".`
            }
          })
        });
        
        const summaryData = await summaryResponse.json();
        
        if (summaryData.status === 'success') {
          summary = summaryData.data.summary;
          detailedSummary = summaryData.data.detailedSummary;
          keyPoints = summaryData.data.keyPoints;
        } else {
          // Continue even if summarization fails
          console.error('Error generating summary:', summaryData.message);
        }
      } catch (summaryErr) {
        console.error('Error generating summary:', summaryErr);
        // Continue with import even if summarization fails
      }
      
      // Add summary if available
      const cardWithSummary = {
        ...newCard,
        summary,
        detailedSummary,
        keyPoints,
        lastSummaryGeneration: summary ? new Date() : undefined
      };
      
      // Save to knowledge base
      const savedCard = await knowledgeCardsAPI.add(cardWithSummary);
      
      toast.success('Video transcript saved to knowledge base!');
      
      // Reset form
      setVideoUrl('');
      setTranscript(null);
      setFormattedTranscript(null);
      setVideoId(null);
      setVideoTitle('');
      setThumbnailUrl(null);
      
      // Notify parent component
      if (onImportComplete) {
        onImportComplete(savedCard.id);
      }
    } catch (err: any) {
      console.error('Error saving transcript:', err);
      setError(err.message || 'Failed to save transcript');
    } finally {
      setIsImporting(false);
    }
  };
  
  // Render preview of extracted thumbnail
  const renderThumbnailPreview = () => {
    if (!thumbnailUrl) return null;
    
    return (
      <div className="mt-4 rounded-md overflow-hidden w-full max-w-md">
        <img 
          src={thumbnailUrl} 
          alt="Video thumbnail" 
          className="w-full h-auto"
        />
      </div>
    );
  };
  
  // Render preview of extracted transcript
  const renderTranscriptPreview = () => {
    if (!formattedTranscript) return null;
    
    return (
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Transcript Preview</h3>
        <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm font-mono whitespace-pre-wrap">
          {formattedTranscript}
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Import YouTube Video Transcript</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="youtube-url" className="block text-sm font-medium mb-1">
          YouTube Video URL
        </label>
        <div className="flex gap-2">
          <input
            id="youtube-url"
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800"
            disabled={isExtracting}
          />
          <button
            onClick={extractTranscript}
            disabled={isExtracting || !videoUrl.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
          >
            {isExtracting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting...
              </>
            ) : (
              'Extract Transcript'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enter a YouTube video URL or ID to extract its transcript
        </p>
      </div>
      
      {thumbnailUrl && (
        <div className="mb-4">
          <label htmlFor="video-title" className="block text-sm font-medium mb-1">
            Video Title
          </label>
          <input
            id="video-title"
            type="text"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800"
          />
        </div>
      )}
      
      {renderThumbnailPreview()}
      {renderTranscriptPreview()}
      
      {formattedTranscript && (
        <div className="mt-6">
          <button
            onClick={saveTranscript}
            disabled={isImporting}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving to Knowledge Base...
              </>
            ) : (
              'Save to Knowledge Base'
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            This will store the transcript and generate a summary using Ollama
          </p>
        </div>
      )}
    </div>
  );
} 