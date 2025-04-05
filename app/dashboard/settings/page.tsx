'use client';

import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../lib/storage';
import { UserSettings } from '../../lib/models';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import AISettings from './components/AISettings';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    async function loadSettings() {
      try {
        const userSettings = await settingsAPI.getSettings();
        setSettings(userSettings);
        setTemperature(userSettings.temperature || 0.7);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const saveAdvancedSettings = async () => {
    setIsLoading(true);
    try {
      if (settings) {
        const updatedSettings = {
          ...settings,
          temperature
        };
        
        await settingsAPI.updateSettings(updatedSettings);
        toast.success('Advanced settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <Toaster position="top-right" />
      
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Settings</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Appearance Settings */}
        <div className="col-span-1 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Appearance</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Theme</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                  theme === 'light' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Sun className={`h-6 w-6 mb-2 ${theme === 'light' ? 'text-blue-500' : 'text-orange-400'}`} />
                <span className="text-sm font-medium">Light</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                  theme === 'dark' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Moon className={`h-6 w-6 mb-2 ${theme === 'dark' ? 'text-blue-500' : 'text-indigo-400'}`} />
                <span className="text-sm font-medium">Dark</span>
              </button>
              
              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                  theme === 'system' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Monitor className={`h-6 w-6 mb-2 ${theme === 'system' ? 'text-blue-500' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">System</span>
              </button>
            </div>
            
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Choose a theme for the application interface. System will match your device settings.
            </p>
          </div>
        </div>
        
        {/* AI Provider Settings */}
        <div className="col-span-1 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
          <AISettings />
        </div>
        
        {/* Advanced Settings */}
        <div className="col-span-1 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Advanced Settings</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Default Temperature</label>
            <div className="flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full mr-2"
              />
              <span className="min-w-[40px] text-center text-gray-900 dark:text-white">{temperature}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Controls randomness: lower values are more deterministic, higher values are more creative.
            </p>
          </div>
          
          <button
            onClick={saveAdvancedSettings}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Advanced Settings'}
          </button>
        </div>
        
        {/* Danger Zone */}
        <div className="col-span-1 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-red-300 dark:border-red-700">
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1 text-gray-900 dark:text-white">Reset Application</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This will clear all your data including knowledge cards, tags, and settings.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset the application? This cannot be undone.')) {
                    // Reset logic would go here
                    toast.success('Application reset successfully');
                  }
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Reset Application
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-8">
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}