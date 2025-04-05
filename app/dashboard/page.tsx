'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeCard } from '../lib/models';
import { knowledgeCardsAPI } from '../lib/storage';
import { Calendar, Database, BookOpen, LayoutDashboard, Zap, Plus } from 'lucide-react';
import KnowledgeCardComponent from '../components/KnowledgeCard';
import SkeletonCard from '../components/SkeletonCard';

export default function Dashboard() {
  const [recentCards, setRecentCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentCards() {
      try {
        setLoading(true);
        const allCards = await knowledgeCardsAPI.getAll();
        
        // Sort by updated date
        const sorted = [...allCards].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        // Take the most recent 3
        setRecentCards(sorted.slice(0, 3));
      } catch (error) {
        console.error('Error fetching recent cards:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentCards();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <LayoutDashboard className="h-6 w-6 mr-2 text-blue-500" />
          Dashboard
        </h1>
        
        <Link 
          href="/dashboard/import" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Content</span>
        </Link>
      </div>
      
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mr-4">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Cards</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{loading ? '...' : recentCards.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mr-4">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Recall Score</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">92%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 mr-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Study Sessions</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 mr-4">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Daily Streak</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">5</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Content */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-500" />
            Recent Content
          </h2>
          <Link href="/dashboard/knowledge-base" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(index => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : recentCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCards.map(card => (
              <KnowledgeCardComponent key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm text-center">
            <Database className="h-16 w-16 mb-4 text-gray-400" />
            <p className="text-xl text-gray-700 dark:text-gray-300">No content yet</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
              Start by adding your first piece of content to build your knowledge base
            </p>
            <Link 
              href="/dashboard/import" 
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Content</span>
            </Link>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          href="/dashboard/import" 
          className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mb-4">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-gray-800 dark:text-white font-medium">Import Content</span>
        </Link>
        
        <Link 
          href="/dashboard/learn" 
          className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <span className="text-gray-800 dark:text-white font-medium">Start Learning</span>
        </Link>
        
        <Link 
          href="/dashboard/graph" 
          className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 mb-4">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 19C3 16.7909 4.79086 15 7 15C9.20914 15 11 16.7909 11 19C11 21.2091 9.20914 23 7 23C4.79086 23 3 21.2091 3 19Z" className="fill-current" />
              <path d="M13 5C13 2.79086 14.7909 1 17 1C19.2091 1 21 2.79086 21 5C21 7.20914 19.2091 9 17 9C14.7909 9 13 7.20914 13 5Z" className="fill-current" />
              <path d="M8 12H16M16 12V6M16 12L12 8" strokeWidth="2" strokeLinecap="round" className="stroke-current" />
            </svg>
          </div>
          <span className="text-gray-800 dark:text-white font-medium">View Graph</span>
        </Link>
        
        <Link 
          href="/dashboard/search" 
          className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 mb-4">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-current" />
            </svg>
          </div>
          <span className="text-gray-800 dark:text-white font-medium">Search</span>
        </Link>
      </div>
    </div>
  );
} 