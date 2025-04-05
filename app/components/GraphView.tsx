'use client';

import React, { useEffect, useRef, useState } from 'react';
import { KnowledgeCard, Tag } from '@/app/lib/models';
import dynamic from 'next/dynamic';

// Dynamically import ForceGraph2D with ssr: false
// This ensures that AFRAME and other browser-only dependencies aren't loaded during SSR
const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

// Prevent AFRAME error by ensuring no direct imports of ForceGraph3D or ForceGraphVR
// We're only using ForceGraph2D in this component

interface GraphNode {
  id: string;
  name: string;
  type: 'card' | 'tag';
  val: number;
  color: string;
  cardDetails?: Partial<KnowledgeCard>;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphViewProps {
  cards: KnowledgeCard[];
  onNodeClick?: (nodeId: string, nodeType: 'card' | 'tag') => void;
}

export default function GraphView({ cards, onNodeClick }: GraphViewProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Colors for different content types
  const contentTypeColors = {
    article: '#3b82f6', // blue
    video: '#ef4444',   // red
    pdf: '#f97316',     // orange
    podcast: '#8b5cf6', // purple
    note: '#10b981',    // green
    website: '#6366f1', // indigo
    other: '#6b7280'    // gray
  };

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, window.innerHeight * 0.7)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Process knowledge cards into graph data
  useEffect(() => {
    if (!cards || cards.length === 0) return;

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const tagMap = new Map<string, Tag>();

    // First pass: collect all unique tags
    cards.forEach(card => {
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tag => {
          tagMap.set(tag.id, tag);
        });
      }
    });

    // Add tag nodes
    tagMap.forEach((tag) => {
      nodes.push({
        id: `tag-${tag.id}`,
        name: tag.name,
        type: 'tag',
        val: 3,
        color: '#9ca3af' // gray tag color
      });
    });

    // Add card nodes and links to tags
    cards.forEach(card => {
      // Add card node
      nodes.push({
        id: `card-${card.id}`,
        name: card.title,
        type: 'card',
        val: 5,
        color: contentTypeColors[card.contentType] || contentTypeColors.other,
        cardDetails: {
          id: card.id,
          title: card.title,
          contentType: card.contentType,
          summary: card.summary,
          sourceName: card.sourceName
        }
      });

      // Add links to tags
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tag => {
          links.push({
            source: `card-${card.id}`,
            target: `tag-${tag.id}`,
            value: 1
          });
        });
      }

      // Add links to related cards
      if (card.relatedCardIds && card.relatedCardIds.length > 0) {
        card.relatedCardIds.forEach(relatedId => {
          // Avoid duplicate links
          const alreadyExists = links.some(
            link => 
              (link.source === `card-${card.id}` && link.target === `card-${relatedId}`) || 
              (link.source === `card-${relatedId}` && link.target === `card-${card.id}`)
          );
          
          if (!alreadyExists) {
            links.push({
              source: `card-${card.id}`,
              target: `card-${relatedId}`,
              value: 2
            });
          }
        });
      }
    });

    setGraphData({ nodes, links });
  }, [cards]);

  // Handle node click
  const handleNodeClick = (node: any) => {
    if (onNodeClick && node.id) {
      const [type, id] = node.id.split('-');
      onNodeClick(id, type as 'card' | 'tag');
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <p className="text-gray-500 dark:text-gray-400">No data available for graph visualization</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-hidden"
    >
      {typeof window !== 'undefined' && (
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => `${node.name} (${node.type})`}
          nodeColor={(node: any) => node.color}
          nodeVal={(node: any) => node.val}
          linkWidth={(link: any) => link.value * 0.5}
          cooldownTicks={100}
          onNodeClick={handleNodeClick}
          backgroundColor="transparent"
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 14 / globalScale;
            ctx.font = `${fontSize}px Arial`;
            const textWidth = ctx.measureText(label).width;
            const backgroundNodeSize = Math.max(8, textWidth * 0.7);
            
            // Draw a circular background
            ctx.beginPath();
            ctx.arc(node.x, node.y, backgroundNodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
    
            // Draw text label for larger nodes
            if (globalScale > 0.7) {
              const textColor = '#ffffff';
              ctx.fillStyle = textColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, node.x, node.y);
            }
          }}
        />
      )}

      <div className="flex flex-wrap gap-3 mt-4 justify-center pt-3 border-t border-gray-200 dark:border-gray-700">
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
  );
} 