'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContentType } from '../../lib/models';
import { settingsAPI } from '../../lib/storage';
import { importContent } from './utils/importHelper';
import { extractVideoId } from '@/app/lib/youtube-transcript';
import { toast } from 'react-hot-toast';
import { Upload, ExternalLink, Youtube, Tag as TagIcon, RefreshCw } from 'lucide-react';

export default function ImportPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [contentType, setContentType] = useState<ContentType>(ContentType.Note);
  const [tags, setTags] = useState<string>('');
  const [summarize, setSummarize] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ollamaModel, setOllamaModel] = useState('llama3');
  
  // YouTube specific states
  const [isYouTubeUrl, setIsYouTubeUrl] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [formattedTranscript, setFormattedTranscript] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<{id: string, name: string}[]>([]);
  const [extractingTags, setExtractingTags] = useState(false);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        setOllamaModel(settings.defaultModel);
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      setError('Title and content are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Convert tags string to array of tag objects
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag)
        .map(name => ({ id: crypto.randomUUID(), name }));
      
      // Use our new import helper that handles client-side storage
      const result = await importContent(
        title,
        content,
        contentType,
        sourceUrl,
        sourceName,
        {
          tags: tagArray,
          summarize,
          model: ollamaModel
        }
      );
      
      setSuccess('Content added successfully!');
      setTimeout(() => {
        router.push(`/dashboard/knowledge-base?highlight=${result.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error adding content:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while adding content');
    } finally {
      setLoading(false);
    }
  };

  // Check if URL is a YouTube URL and update state
  const checkIfYouTubeUrl = (url: string) => {
    const videoId = extractVideoId(url);
    const isYouTube = Boolean(videoId);
    setIsYouTubeUrl(isYouTube);
    return isYouTube;
  };

  // Unified URL processing function
  const processUrl = async () => {
    if (!sourceUrl) {
      setFetchError('Please enter a URL');
      return;
    }
    
    try {
      setLoading(true);
      setFetchError(null);
      setError(null);
      
      // Check if it's a YouTube URL
      const isYouTube = checkIfYouTubeUrl(sourceUrl);
      
      if (isYouTube) {
        await processYouTubeUrl();
      } else {
        await processRegularUrl();
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      setFetchError(error instanceof Error ? error.message : 'An error occurred while processing the URL');
    } finally {
      setLoading(false);
    }
  };

  // Process YouTube URL
  const processYouTubeUrl = async () => {
    try {
      const response = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl: sourceUrl.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'error') {
        setFetchError(data.message || 'Failed to extract transcript');
        return;
      }
      
      // Set transcript data
      setTranscript(data.data.transcript);
      setFormattedTranscript(data.data.formattedTranscript);
      setVideoId(data.data.videoId);
      setContentType(ContentType.Video);
      
      // Set metadata if available
      if (data.data.metadata) {
        setThumbnailUrl(data.data.metadata.thumbnailUrl);
        const defaultTitle = data.data.metadata.title || `YouTube Video (${data.data.videoId})`;
        setVideoTitle(defaultTitle);
        setTitle(defaultTitle);
      } else {
        const defaultTitle = `YouTube Video (${data.data.videoId})`;
        setVideoTitle(defaultTitle);
        setTitle(defaultTitle);
      }
      
      // Set content to the formatted transcript
      setContent(data.data.formattedTranscript);
      setSourceName('YouTube');
      
      toast.success('YouTube transcript extracted successfully!');
      
      // After setting content, extract tags
      setTimeout(() => extractTagsFromContent(), 1000);
      
    } catch (err: any) {
      console.error('Error extracting transcript:', err);
      setFetchError(err.message || 'An unexpected error occurred');
    }
  };

  // Process regular URL
  const processRegularUrl = async () => {
    try {
      const response = await fetch('/api/extract-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sourceUrl,
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Fill form with extracted data
        setTitle(data.data.title || '');
        setContent(data.data.content || '');
        setSourceName(data.data.siteName || new URL(sourceUrl).hostname);
        
        // Set content type
        setContentType(ContentType.Article);
        
        toast.success('Content extracted successfully!');
        
        // After setting content, extract tags
        setTimeout(() => extractTagsFromContent(), 1000);
      } else {
        setFetchError(data.message || 'Failed to extract content from URL');
      }
    } catch (error) {
      console.error('Error fetching URL content:', error);
      setFetchError('An error occurred while fetching content from URL');
    }
  };

  const getContentTypes = () => {
    const types = [
      { value: ContentType.Note, label: 'Note' },
      { value: ContentType.Article, label: 'Article' },
      { value: ContentType.Video, label: 'Video' },
      { value: ContentType.PDF, label: 'PDF' },
      { value: ContentType.Podcast, label: 'Podcast' },
      { value: ContentType.Website, label: 'Website' }
    ];
    
    return types.map(type => (
      <option key={type.value} value={type.value}>{type.label}</option>
    ));
  };

  // Save YouTube transcript directly to knowledge base
  const saveYouTubeTranscript = async () => {
    if (!formattedTranscript || !videoId) {
      setError('No transcript data available');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a new knowledge card
      const newCard = {
        title: videoTitle || `YouTube Video (${videoId})`,
        content: formattedTranscript,
        contentType: ContentType.Video,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sourceName: 'YouTube',
        tags: tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag)
          .map(name => ({ id: crypto.randomUUID(), name })),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Generate summary via Ollama
      let summary = null;
      let detailedSummary = null;
      let keyPoints = null;
      
      if (summarize) {
        try {
          const summaryResponse = await fetch('/api/ollama/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: formattedTranscript,
              options: {
                model: ollamaModel,
                contentType: 'video',
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
            console.error('Error generating summary:', summaryData.message);
          }
        } catch (summaryErr) {
          console.error('Error generating summary:', summaryErr);
        }
      }
      
      // Add summary if available
      const cardWithSummary = {
        ...newCard,
        summary,
        detailedSummary,
        keyPoints,
        lastSummaryGeneration: summary ? new Date() : undefined
      };
      
      // Use import helper function
      const result = await importContent(
        cardWithSummary.title,
        cardWithSummary.content,
        cardWithSummary.contentType,
        cardWithSummary.sourceUrl,
        cardWithSummary.sourceName,
        {
          tags: cardWithSummary.tags,
          summarize: false, // Already summarized above
          summary: cardWithSummary.summary,
          detailedSummary: cardWithSummary.detailedSummary,
          keyPoints: cardWithSummary.keyPoints
        }
      );
      
      toast.success('Video transcript saved to knowledge base!');
      
      // Reset form
      setSourceUrl('');
      setTranscript(null);
      setFormattedTranscript(null);
      setVideoId(null);
      setVideoTitle('');
      setThumbnailUrl(null);
      setTitle('');
      setContent('');
      setSourceName('');
      setContentType(ContentType.Note);
      setTags('');
      setIsYouTubeUrl(false);
      
      // Redirect to knowledge base
      setTimeout(() => {
        router.push(`/dashboard/knowledge-base?highlight=${result.id}`);
      }, 1500);
      
    } catch (err: any) {
      console.error('Error saving transcript:', err);
      setError(err.message || 'Failed to save transcript');
    } finally {
      setLoading(false);
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

  // Extract tags automatically from content
  const extractTagsFromContent = async () => {
    if (!content || content.length < 100) return;
    
    try {
      setExtractingTags(true);
      
      const response = await fetch('/api/tags/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.substring(0, 5000), // Limit to 5000 chars
          contentType,
          title,
          url: sourceUrl
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data.tags && data.data.tags.length > 0) {
        // Convert suggested tags to tag format and update state
        const suggestions = data.data.tags.map((tag: string) => ({
          id: crypto.randomUUID(),
          name: tag.trim().toLowerCase()
        }));
        
        setTagSuggestions(suggestions);
        
        // If no tags are set yet, auto-select these tags
        if (!tags || tags.trim() === '') {
          setTags(suggestions.map(tag => tag.name).join(', '));
        }
        
        toast.success('Tags extracted successfully!');
      }
    } catch (error) {
      console.error('Error extracting tags:', error);
    } finally {
      setExtractingTags(false);
    }
  };
  
  const addTagSuggestion = (tag: {id: string, name: string}) => {
    const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
    
    // Check if tag already exists
    if (currentTags.includes(tag.name)) return;
    
    // Add the tag
    const newTags = [...currentTags, tag.name];
    setTags(newTags.join(', '));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
        <Upload className="h-6 w-6 mr-2 text-blue-500" />
        Import Content
      </h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {/* URL Input Section with modern styling */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source URL
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ExternalLink className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    setIsYouTubeUrl(checkIfYouTubeUrl(e.target.value));
                  }}
                  placeholder="https://example.com/article"
                  className="pl-10 w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isYouTubeUrl && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Youtube className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={processUrl}
                disabled={loading || !sourceUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Extract Content</>
                )}
              </button>
            </div>
          </div>
          {fetchError && (
            <div className="mt-2 text-sm text-red-500">{fetchError}</div>
          )}
        </div>

        {/* Render YouTube preview if available */}
        {isYouTubeUrl && videoId && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">YouTube Preview</h3>
            {renderThumbnailPreview()}
            <div className="flex justify-end mt-4">
              <button
                onClick={saveYouTubeTranscript}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save to Knowledge Base</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main form */}
        {!isYouTubeUrl || !videoId ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a title for this content"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // Extract tags when content changes significantly
                  if (e.target.value.length > 500 && Math.abs(e.target.value.length - content.length) > 200) {
                    extractTagsFromContent();
                  }
                }}
                rows={12}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste or type content here"
                required
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label htmlFor="tags" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <TagIcon className="h-4 w-4 mr-1" />
                Tags (comma separated)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="learning, productivity, science"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={extractTagsFromContent}
                  disabled={extractingTags || !content || content.length < 100}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extractingTags ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {/* Tag suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggested tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => addTagSuggestion(tag)}
                        className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30"
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="sourceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source Name
              </label>
              <input
                id="sourceName"
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., YouTube, Wikipedia, Book Title"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content Type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getContentTypes()}
              </select>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  id="summarize"
                  type="checkbox"
                  checked={summarize}
                  onChange={(e) => setSummarize(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="summarize" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Automatically generate summary and key points
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Uses Ollama ({ollamaModel}) to automatically generate a summary and extract key points from the content.
              </p>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setContent('');
                  setSourceUrl('');
                  setSourceName('');
                  setTags('');
                  setError(null);
                  setSuccess(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading || !title || !content}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save to Knowledge Base</>
                )}
              </button>
            </div>
            
            {error && (
              <div className="text-red-500 mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="text-green-500 mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                {success}
              </div>
            )}
          </form>
        ) : null}
      </div>
    </div>
  );
} 