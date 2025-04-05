'use client';

import { useState, useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignJustify, AlignLeft, List } from 'lucide-react';

type SummaryMode = 'concise' | 'detailed' | 'keypoints';

interface SummaryToggleProps {
  initialMode?: SummaryMode;
  onChange: (mode: SummaryMode) => void;
}

export default function SummaryToggle({ initialMode = 'concise', onChange }: SummaryToggleProps) {
  const [mode, setMode] = useState<SummaryMode>(initialMode);
  
  // Initialize mode from props
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  
  const handleModeChange = (value: string) => {
    if (value && (value === 'concise' || value === 'detailed' || value === 'keypoints')) {
      setMode(value as SummaryMode);
      onChange(value as SummaryMode);
    }
  };
  
  return (
    <div className="flex items-center justify-center mb-4">
      <ToggleGroup type="single" value={mode} onValueChange={handleModeChange}>
        <ToggleGroupItem value="concise" aria-label="Concise summary">
          <AlignLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Concise</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem value="detailed" aria-label="Detailed summary">
          <AlignJustify className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Detailed</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem value="keypoints" aria-label="Key points">
          <List className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Key Points</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
} 