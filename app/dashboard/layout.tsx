import React from 'react';
import Link from 'next/link';
import { 
  Home, 
  Database, 
  BookOpen, 
  Upload, 
  Settings, 
  Search,
  Network
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white dark:bg-gray-900 shadow-md fixed h-full z-10 transition-all duration-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 hidden md:block">LocalRecall</h1>
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 md:hidden">LR</h1>
        </div>
        <nav className="p-2 md:p-4">
          <ul className="space-y-2">
            <li>
              <Link 
                href="/dashboard" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <Home className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Home</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/knowledge-base" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <Database className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Knowledge Base</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/learn" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <BookOpen className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Learn</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/import" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <Upload className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Import</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/search" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <Search className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Search</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/settings" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Settings</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/graph" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group transition-colors"
              >
                <Network className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                <span className="ml-3 hidden md:inline">Graph</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 ml-20 md:ml-64 transition-all duration-300">
        {/* Content area with proper padding */}
        <div className="p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
} 