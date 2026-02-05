"use client";

/**
 * Relationship Graph Component
 *
 * Simple SVG-based graph visualization for asset relationships
 * Can be extended to use react-flow or vis.js for more complex visualizations
 */

import * as React from "react";
import { ZoomIn, ZoomOut, Maximize2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  RelationshipGraph as RelationshipGraphType,
  RelationshipGraphNode,
  RelationshipGraphEdge,
} from "../../types";
import { EXTENDED_ASSET_TYPE_LABELS, RELATIONSHIP_LABELS } from "../../types";

// ============================================
// Types
// ============================================

interface Position {
  x: number;
  y: number;
}

interface NodeWithPosition extends RelationshipGraphNode {
  position: Position;
}

interface RelationshipGraphProps {
  graph: RelationshipGraphType;
  /** Central node ID (highlighted) */
  centralNodeId?: string;
  /** Called when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Called when an edge is clicked */
  onEdgeClick?: (edgeId: string) => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

const NODE_RADIUS = 40;

const ASSET_TYPE_COLORS: Record<string, string> = {
  domain: "#3b82f6",
  website: "#22c55e",
  service: "#a855f7",
  project: "#f97316",
  repository: "#f97316", // @deprecated
  cloud: "#06b6d4",
  credential: "#ef4444",
  host: "#64748b",
  container: "#6366f1",
  database: "#eab308",
  mobile: "#ec4899",
  api: "#10b981",
  k8s_cluster: "#2563eb",
  k8s_workload: "#60a5fa",
  container_image: "#8b5cf6",
  api_collection: "#14b8a6",
  api_endpoint: "#2dd4bf",
  network: "#6b7280",
  load_balancer: "#f59e0b",
  identity_provider: "#f43f5e",
};

// ============================================
// Layout Algorithm (Simple Force-Directed)
// ============================================

function calculateNodePositions(
  nodes: RelationshipGraphNode[],
  edges: RelationshipGraphEdge[],
  centralNodeId?: string,
  width: number = 600,
  height: number = 400
): NodeWithPosition[] {
  if (nodes.length === 0) return [];

  // Simple circular layout with central node
  const centerX = width / 2;
  const centerY = height / 2;

  // If there's a central node, place it in the center
  const centralNode = centralNodeId
    ? nodes.find((n) => n.id === centralNodeId)
    : nodes[0];
  const otherNodes = nodes.filter((n) => n.id !== centralNode?.id);

  const result: NodeWithPosition[] = [];

  // Place central node
  if (centralNode) {
    result.push({
      ...centralNode,
      position: { x: centerX, y: centerY },
    });
  }

  // Place other nodes in a circle around the center
  const angleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);
  const radius = Math.min(width, height) / 2 - NODE_RADIUS - 20;

  otherNodes.forEach((node, index) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    result.push({
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    });
  });

  return result;
}

// ============================================
// Graph Node Component
// ============================================

interface GraphNodeProps {
  node: NodeWithPosition;
  isCentral: boolean;
  onClick?: () => void;
}

function GraphNode({ node, isCentral, onClick }: GraphNodeProps) {
  const color = ASSET_TYPE_COLORS[node.type] || "#6b7280";
  const label = EXTENDED_ASSET_TYPE_LABELS[node.type] || node.type;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g
            transform={`translate(${node.position.x}, ${node.position.y})`}
            onClick={onClick}
            style={{ cursor: "pointer" }}
          >
            {/* Node circle */}
            <circle
              r={isCentral ? NODE_RADIUS + 5 : NODE_RADIUS}
              fill={`${color}20`}
              stroke={color}
              strokeWidth={isCentral ? 3 : 2}
              className="transition-all hover:opacity-80"
            />
            {/* Icon placeholder */}
            <circle r={15} fill={color} />
            <Link2
              x={-8}
              y={-8}
              width={16}
              height={16}
              className="text-white"
              style={{ color: "white" }}
            />
            {/* Name label */}
            <text
              y={NODE_RADIUS + 15}
              textAnchor="middle"
              className="text-xs font-medium fill-foreground"
            >
              {node.name.length > 15 ? `${node.name.slice(0, 12)}...` : node.name}
            </text>
            {/* Type label */}
            <text
              y={NODE_RADIUS + 28}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground"
            >
              {label}
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{node.name}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {node.riskScore !== undefined && (
              <p className="text-xs">Risk Score: {node.riskScore}</p>
            )}
            {node.findingCount !== undefined && (
              <p className="text-xs">Findings: {node.findingCount}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Graph Edge Component
// ============================================

interface GraphEdgeProps {
  edge: RelationshipGraphEdge;
  sourcePos: Position;
  targetPos: Position;
  onClick?: () => void;
}

function GraphEdge({ edge, sourcePos, targetPos, onClick }: GraphEdgeProps) {
  // Calculate edge path with offset for node radius
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const unitX = dx / distance;
  const unitY = dy / distance;

  const startX = sourcePos.x + unitX * NODE_RADIUS;
  const startY = sourcePos.y + unitY * NODE_RADIUS;
  const endX = targetPos.x - unitX * (NODE_RADIUS + 10); // Extra offset for arrow
  const endY = targetPos.y - unitY * (NODE_RADIUS + 10);

  // Midpoint for label
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Arrow color based on impact
  const getEdgeColor = () => {
    if (edge.impactWeight >= 8) return "#ef4444";
    if (edge.impactWeight >= 5) return "#eab308";
    return "#6b7280";
  };

  const edgeColor = getEdgeColor();
  const labels = RELATIONSHIP_LABELS[edge.type];

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Edge line */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={edgeColor}
        strokeWidth={2}
        strokeOpacity={0.6}
        markerEnd="url(#arrowhead)"
        className="transition-all hover:stroke-opacity-100"
      />
      {/* Label background */}
      <rect
        x={midX - 30}
        y={midY - 10}
        width={60}
        height={20}
        rx={4}
        fill="hsl(var(--background))"
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
      {/* Label text */}
      <text
        x={midX}
        y={midY + 4}
        textAnchor="middle"
        className="text-[9px] fill-muted-foreground"
      >
        {labels?.direct || edge.type}
      </text>
    </g>
  );
}

// ============================================
// Relationship Graph Component
// ============================================

export function RelationshipGraphView({
  graph,
  centralNodeId,
  onNodeClick,
  onEdgeClick,
  className,
}: RelationshipGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 600, height: 400 });
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Update dimensions on resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 400), height: Math.max(height, 300) });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Calculate node positions
  const nodesWithPositions = React.useMemo(
    () =>
      calculateNodePositions(
        graph.nodes,
        graph.edges,
        centralNodeId,
        dimensions.width,
        dimensions.height
      ),
    [graph.nodes, graph.edges, centralNodeId, dimensions]
  );

  // Get node position by ID
  const getNodePosition = (nodeId: string): Position | undefined => {
    return nodesWithPositions.find((n) => n.id === nodeId)?.position;
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (graph.nodes.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-[400px] rounded-lg border bg-muted/30",
          className
        )}
      >
        <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No relationships to display</p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg border bg-card overflow-hidden", className)}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReset}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-2 flex-wrap max-w-[200px]">
        {Array.from(new Set(graph.nodes.map((n) => n.type))).slice(0, 4).map((type) => (
          <Badge
            key={type}
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: ASSET_TYPE_COLORS[type] }}
          >
            {EXTENDED_ASSET_TYPE_LABELS[type]}
          </Badge>
        ))}
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        className="h-[400px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "center",
          }}
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
          </defs>

          {/* Edges */}
          {graph.edges.map((edge) => {
            const sourcePos = getNodePosition(edge.source);
            const targetPos = getNodePosition(edge.target);
            if (!sourcePos || !targetPos) return null;

            return (
              <GraphEdge
                key={edge.id}
                edge={edge}
                sourcePos={sourcePos}
                targetPos={targetPos}
                onClick={() => onEdgeClick?.(edge.id)}
              />
            );
          })}

          {/* Nodes */}
          {nodesWithPositions.map((node) => (
            <GraphNode
              key={node.id}
              node={node}
              isCentral={node.id === centralNodeId}
              onClick={() => onNodeClick?.(node.id)}
            />
          ))}
        </svg>
      </div>

      {/* Stats */}
      <div className="absolute top-2 left-2 z-10 text-xs text-muted-foreground">
        {graph.nodes.length} nodes, {graph.edges.length} edges
      </div>
    </div>
  );
}

// ============================================
// Mini Graph (for cards/previews)
// ============================================

interface MiniGraphProps {
  graph: RelationshipGraphType;
  centralNodeId?: string;
  className?: string;
}

export function MiniGraph({ graph, centralNodeId, className }: MiniGraphProps) {
  const nodesWithPositions = React.useMemo(
    () => calculateNodePositions(graph.nodes, graph.edges, centralNodeId, 200, 150),
    [graph.nodes, graph.edges, centralNodeId]
  );

  const getNodePosition = (nodeId: string): Position | undefined => {
    return nodesWithPositions.find((n) => n.id === nodeId)?.position;
  };

  if (graph.nodes.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-[100px] rounded border bg-muted/30",
          className
        )}
      >
        <Link2 className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("rounded border bg-card overflow-hidden", className)}>
      <svg width="100%" height="100" viewBox="0 0 200 150">
        {/* Edges */}
        {graph.edges.map((edge) => {
          const sourcePos = getNodePosition(edge.source);
          const targetPos = getNodePosition(edge.target);
          if (!sourcePos || !targetPos) return null;

          return (
            <line
              key={edge.id}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#6b7280"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          );
        })}

        {/* Nodes */}
        {nodesWithPositions.map((node) => {
          const color = ASSET_TYPE_COLORS[node.type] || "#6b7280";
          const isCentral = node.id === centralNodeId;

          return (
            <circle
              key={node.id}
              cx={node.position.x}
              cy={node.position.y}
              r={isCentral ? 12 : 8}
              fill={`${color}40`}
              stroke={color}
              strokeWidth={isCentral ? 2 : 1}
            />
          );
        })}
      </svg>
    </div>
  );
}
