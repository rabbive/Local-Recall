'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeCard, ContentType } from '../lib/models';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { ExternalLink, ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface KnowledgeCardProps {
  card: KnowledgeCard;
  onDelete?: (id: string) => void;
  highlight?: boolean;
  onTagClick?: (tagId: string) => void;
}

export default function KnowledgeCardComponent({ card, onDelete, highlight = false, onTagClick }: KnowledgeCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Effect to auto-expand when highlighted
  useEffect(() => {
    if (highlight) {
      setExpanded(true);
    }
  }, [highlight]);

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case ContentType.Article:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
            <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
          </svg>
        );
      case ContentType.Video:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case ContentType.Podcast:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get the color for the content type badge
  const getContentTypeColor = (type: ContentType) => {
    switch (type) {
      case ContentType.Article: return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case ContentType.Video: return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case ContentType.Podcast: return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      case ContentType.PDF: return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      case ContentType.Note: return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case ContentType.Website: return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Card className={`h-full overflow-hidden transition-all duration-300 hover:shadow-md ${
      highlight ? 'ring-2 ring-blue-500 scale-[1.02]' : ''
    }`}>
      <CardHeader className="pb-3 relative">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded ${getContentTypeColor(card.contentType)}`}>
              {getContentTypeIcon(card.contentType)}
            </span>
            <h3 className="text-lg font-medium truncate max-w-[200px]">
              {card.title}
            </h3>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(card.id)}
              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
              aria-label="Delete card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        
        {card.sourceUrl && (
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mt-2 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            <span className="truncate">{card.sourceName || 'Source'}</span>
          </a>
        )}
      </CardHeader>
      
      <CardContent className="pb-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
          {card.summary || (card.content && card.content.substring(0, 150) + '...') || 'No summary available'}
        </p>
        
        {card.tags && card.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => onTagClick && onTagClick(tag.id)}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                style={{ borderLeft: tag.color ? `3px solid ${tag.color}` : undefined }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex-col">
        <div className="w-full flex justify-between items-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                <span>Show more</span>
              </>
            )}
          </button>
          
          <Link 
            href={`/dashboard/content/${card.id}`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            <span>View</span>
          </Link>
        </div>
        
        {expanded && (
          <div className="mt-4 w-full pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Points</h4>
            {card.keyPoints && card.keyPoints.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {card.keyPoints.map((point, index) => (
                  <li key={index} className="pl-1">{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No key points available</p>
            )}
            
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
              <span>Created: {new Date(card.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(card.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
} 