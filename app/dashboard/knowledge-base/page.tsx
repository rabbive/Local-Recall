'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { KnowledgeCard, ContentType } from '../../lib/models';
import { knowledgeCardsAPI } from '../../lib/storage';
import KnowledgeCardComponent from '../../components/KnowledgeCard';
import SkeletonCard from '../../components/SkeletonCard';
import { SearchX, Database, NetworkIcon, HashIcon, RefreshCw, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import GraphView with SSR disabled to prevent AFRAME errors
const GraphView = dynamic(
  () => import('@/app/components/GraphView'),
  { ssr: false, loading: () => (
    <div className="flex justify-center items-center h-[70vh] bg-gray-50 dark:bg-gray-800 rounded-lg">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
    </div>
  )}
);

export default function KnowledgeBase() {
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<KnowledgeCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  // Effects
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const cards = await knowledgeCardsAPI.getAll();
        setKnowledgeCards(cards);
        
        // Apply search params if present
        const tagParam = searchParams?.get('tag');
        if (tagParam) {
          setSelectedTags([tagParam]);
        }
      } catch (error) {
        console.error('Error fetching knowledge cards:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCards();
  }, [searchParams]);
  
  // Filter cards based on search and tags
  useEffect(() => {
    let result = [...knowledgeCards];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(card => 
        card.title.toLowerCase().includes(query) || 
        (card.summary && card.summary.toLowerCase().includes(query)) ||
        (card.content && card.content.toLowerCase().includes(query))
      );
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter(card => 
        card.tags && card.tags.some(tag => selectedTags.includes(tag.id))
      );
    }
    
    setFilteredCards(result);
  }, [knowledgeCards, searchQuery, selectedTags]);
  
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
  
  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };
  
  // Toggle filter visibility
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };
  
  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'cards' ? 'graph' : 'cards');
  };
  
  // Handle a card being clicked in graph view
  const handleGraphNodeClick = (nodeId: string, nodeType: 'card' | 'tag') => {
    if (nodeType === 'tag') {
      toggleTag(nodeId);
    }
  };

  // Render skeleton loading cards
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <SkeletonCard key={index} />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Database className="h-6 w-6 mr-2 text-blue-500" />
          Knowledge Base
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleViewMode}
            className="flex items-center justify-center py-2 px-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm text-sm font-medium transition-colors"
          >
            {viewMode === 'cards' ? (
              <>
                <NetworkIcon className="h-4 w-4 mr-2 text-blue-500" />
                <span>Graph View</span>
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2 text-blue-500" />
                <span>Card View</span>
              </>
            )}
          </button>
          
          <button
            onClick={toggleFilters}
            className="flex items-center justify-center py-2 px-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm text-sm font-medium transition-colors"
          >
            <HashIcon className="h-4 w-4 mr-2 text-blue-500" />
            <span>Filters</span>
          </button>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className={`${showFilters ? 'block' : 'hidden'} space-y-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm transition-all`}>
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <div className="relative">
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, content, or summary..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-400 transition-colors"
              >
                <span className="sr-only">Clear search</span>
                <SearchX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Tags</h3>
          <div className="flex flex-wrap gap-2">
            {getAllTags().map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={{ borderLeft: `3px solid ${tag.color}` }}
              >
                {tag.name}
              </button>
            ))}
            
            {getAllTags().length === 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">No tags found</span>
            )}
          </div>
        </div>
        
        {(searchQuery || selectedTags.length > 0) && (
          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Clear filters
            </button>
          </div>
        )}
      </div>
      
      {/* Content view switcher */}
      {loading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderSkeletons()}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[70vh] bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading graph data...</p>
            </div>
          </div>
        )
      ) : viewMode === 'cards' ? (
        filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map(card => (
              <KnowledgeCardComponent 
                key={card.id} 
                card={card} 
                onTagClick={toggleTag}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
            <SearchX className="h-16 w-16 mb-4 text-gray-400" />
            <p className="text-xl text-gray-700 dark:text-gray-300">No knowledge cards found</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Try removing some filters or add new content to your knowledge base
            </p>
          </div>
        )
      ) : (
        <div className="h-[70vh] bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <GraphView 
            cards={filteredCards} 
            onNodeClick={handleGraphNodeClick} 
          />
        </div>
      )}
      
      {/* Results counter */}
      {!loading && filteredCards.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          <Database className="h-4 w-4 mr-1 opacity-60" />
          <span>Showing {filteredCards.length} of {knowledgeCards.length} knowledge items</span>
        </div>
      )}
    </div>
  );
} 