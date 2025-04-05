import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
          LocalRecall
        </h1>
        <h2 className="text-2xl text-center text-gray-700 dark:text-gray-300 mb-8">
          Your privacy-focused knowledge base using local LLMs
        </h2>

        <div className="flex flex-col md:flex-row gap-6 justify-center mb-12">
          <div className="bg-primary-50 dark:bg-primary-900 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-primary-800 dark:text-primary-200">
              Privacy First
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              All your data stays on your device, powered by Ollama for local LLM processing
            </p>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-primary-800 dark:text-primary-200">
              Knowledge Hub
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Organize and connect all your learning materials in one searchable database
            </p>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-primary-800 dark:text-primary-200">
              Active Learning
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Generate quizzes and use spaced repetition to enhance your memory retention
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Link 
            href="/dashboard" 
            className="px-6 py-3 text-lg bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors shadow-md"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
} 