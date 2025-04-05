'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KnowledgeCard, ContentType } from '../../lib/models';
import { knowledgeCardsAPI } from '../../lib/storage';
import { Network, Tag, Filter, AlertCircle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import GraphView with SSR disabled
const GraphView = dynamic(
  () => import('@/app/components/GraphView'),
  { ssr: false, loading: () => (
    <div className="flex justify-center items-center h-[75vh] bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Preparing graph visualization...</p>
      </div>
    </div>
  )}
);

export default function KnowledgeGraph() {
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<Set<ContentType>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filteredCards, setFilteredCards] = useState<KnowledgeCard[]>([]);
  const router = useRouter();

  // Load knowledge cards
  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        const cards = await knowledgeCardsAPI.getAll();
        setKnowledgeCards(cards);
        setFilteredCards(cards);
      } catch (error) {
        console.error('Error fetching knowledge cards:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...knowledgeCards];
    
    // Apply content type filter
    if (selectedContentTypes.size > 0) {
      result = result.filter(card => selectedContentTypes.has(card.contentType));
    }
    
    // Apply tag filter
    if (selectedTags.size > 0) {
      result = result.filter(card => 
        card.tags && card.tags.some(tag => selectedTags.has(tag.id))
      );
    }
    
    setFilteredCards(result);
  }, [knowledgeCards, selectedContentTypes, selectedTags]);

  // Toggle content type filter
  const toggleContentType = (contentType: ContentType) => {
    const newSelection = new Set(selectedContentTypes);
    if (newSelection.has(contentType)) {
      newSelection.delete(contentType);
    } else {
      newSelection.add(contentType);
    }
    setSelectedContentTypes(newSelection);
  };

  // Toggle tag filter
  const toggleTag = (tagId: string) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId);
    } else {
      newSelection.add(tagId);
    }
    setSelectedTags(newSelection);
  };

  // Get all unique tags
  const getAllTags = () => {
    const tagMap = new Map();
    
    knowledgeCards.forEach(card => {
      if (card.tags) {
        card.tags.forEach(tag => {
          if (!tagMap.has(tag.id)) {
            tagMap.set(tag.id, tag);
          }
        });
      }
    });
    
    return Array.from(tagMap.values());
  };

  // Handle graph node click
  const handleNodeClick = (nodeId: string, nodeType: 'card' | 'tag') => {
    if (nodeType === 'card') {
      // Navigate to content viewer
      router.push(`/dashboard/content/${nodeId}`);
    } else if (nodeType === 'tag') {
      // Toggle tag filter
      toggleTag(nodeId);
    }
  };

  // Get content type color
  const getContentTypeColor = (type: ContentType) => {
    switch (type) {
      case ContentType.Article: return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case ContentType.Video: return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case ContentType.Podcast: return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      case ContentType.PDF: return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      case ContentType.Note: return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case ContentType.Website: return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Network className="h-6 w-6 mr-2 text-blue-500" />
          Knowledge Graph
        </h1>
        
        {/* Content Type Filter Toggle */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center mr-4">
            <Filter className="h-4 w-4 mr-1 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          {Object.values(ContentType).map(type => (
            <button
              key={type}
              onClick={() => toggleContentType(type)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedContentTypes.has(type)
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tag Filters */}
      <div className="flex flex-wrap gap-2 items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center mr-3">
          <Tag className="h-4 w-4 mr-1 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</span>
        </div>
        
        <div className="flex flex-wrap gap-2 flex-1">
          {getAllTags().map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedTags.has(tag.id)
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              style={{ borderLeft: `3px solid ${tag.color}` }}
            >
              {tag.name}
            </button>
          ))}
          
          {getAllTags().length === 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 italic">No tags found</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[75vh] bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">Loading graph data...</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">This may take a moment</p>
          </div>
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="h-[75vh] bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <GraphView cards={filteredCards} onNodeClick={handleNodeClick} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 p-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
          <AlertCircle className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-xl text-gray-700 dark:text-gray-300">No nodes to display</p>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-center max-w-md">
            Try removing some filters or add more content to your knowledge base to visualize connections
          </p>
        </div>
      )}
      
      <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
          <Network className="h-5 w-5 mr-2 text-blue-500" />
          About the Knowledge Graph
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          The knowledge graph visualizes the connections between your content and tags.
          Each node represents either a piece of content or a tag. Lines between nodes represent relationships.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1.5"></span>
            <span className="text-xs text-gray-700 dark:text-gray-300">Article</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1.5"></span>
            <span className="text-xs text-gray-700 dark:text-gray-300">Video</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1.5"></span>
            <span className="text-xs text-gray-700 dark:text-gray-300">PDF</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1.5"></span>
            <span className="text-xs text-gray-700 dark:text-gray-300">Podcast</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1.5"></span>
            <span className="text-xs text-gray-700 dark:text-gray-300">Note</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1.5"></span>
            <span className="text-xs text-gray-700 dark:text-gray-300">Tag</span>
          </div>
        </div>
      </div>
    </div>
  );
} 