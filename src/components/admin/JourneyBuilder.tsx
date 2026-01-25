import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge as ReactFlowEdge,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '../../lib/supabase';
import {
  Save,
  Trash2,
  Plus,
  ChevronLeft,
  Sparkles,
  Upload,
  Loader2,
  BookOpen,
  Video,
  HelpCircle,
  Target,
  FileText,
  Bot,
  Flag,
  Clapperboard,
  Image,
  Check,
  AlertCircle,
  X,
  Code,
  Dumbbell,
  FolderOpen,
  GripVertical,
} from 'lucide-react';
import { BlockEditor } from './BlockEditor';
import { AIContentGenerator } from './AIContentGenerator';
import BlockNode, { type BlockNodeData } from './BlockNode';
import type { Block, Edge, GraphDefinition, BlockType, ConditionGroup, Condition } from '../../types/database';

// Helper function to detect pass/fail edge type from condition
function getEdgeType(condition?: ConditionGroup): 'pass' | 'fail' | 'normal' {
  if (!condition?.all?.[0]) return 'normal';
  const cond = condition.all[0] as Condition;
  if (cond.fact === 'quiz.scorePercent') {
    return cond.op === 'gte' || cond.op === 'gt' ? 'pass' : 'fail';
  }
  return 'normal';
}

interface JourneyBuilderProps {
  moduleId: string;
  journeyVersionId?: string;
  onBack: () => void;
}

interface TrackModuleContext {
  moduleId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  isCurrent: boolean;
  graph: GraphDefinition | null;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'read', label: 'Read', icon: BookOpen, color: 'bg-primary-500' },
  { type: 'video', label: 'Video', icon: Video, color: 'bg-rose-500' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-emerald-500' },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'bg-purple-500' },
  { type: 'mission', label: 'Mission', icon: Target, color: 'bg-orange-500' },
  { type: 'form', label: 'Form', icon: FileText, color: 'bg-teal-500' },
  { type: 'ai_help', label: 'AI Help', icon: Bot, color: 'bg-cyan-500' },
  { type: 'checkpoint', label: 'Checkpoint', icon: Flag, color: 'bg-yellow-500' },
  { type: 'animation', label: 'Animation', icon: Clapperboard, color: 'bg-pink-500' },
  { type: 'code', label: 'Code', icon: Code, color: 'bg-slate-600' },
  { type: 'exercise', label: 'Exercise', icon: Dumbbell, color: 'bg-violet-500' },
  { type: 'resource', label: 'Resources', icon: FolderOpen, color: 'bg-indigo-500' },
];

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

// Custom node types for React Flow
const nodeTypes: NodeTypes = {
  blockNode: BlockNode as any,
};

// Default edge options for consistent styling
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#6366f1', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
};

function JourneyBuilderInner({ moduleId, journeyVersionId, onBack }: JourneyBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  
  const [graph, setGraph] = useState<GraphDefinition>({ startBlockId: '', blocks: [], edges: [] });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BlockNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ReactFlowEdge>([]);
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [connectionMode, setConnectionMode] = useState<{ fromBlockId: string } | null>(null);
  const [moduleName, setModuleName] = useState('');
  const [versionId, setVersionId] = useState(journeyVersionId);
  const [isDirty, setIsDirty] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [trackModulesContext, setTrackModulesContext] = useState<TrackModuleContext[]>([]);

  // Convert graph blocks to React Flow nodes
  const blocksToNodes = useCallback((blocks: Block[], startBlockId: string): Node<BlockNodeData>[] => {
    return blocks.map((block, index) => {
      // Auto-layout if no position stored
      const position = block.ui?.position || {
        x: 400,
        y: 100 + index * 200,
      };

      // Check for pass/fail edges (for quiz blocks)
      const blockEdges = graph.edges.filter(e => e.from === block.id);
      const hasPassEdge = blockEdges.some(e => getEdgeType(e.condition) === 'pass');
      const hasFailEdge = blockEdges.some(e => getEdgeType(e.condition) === 'fail');

      return {
        id: block.id,
        type: 'blockNode',
        position,
        data: {
          block,
          isStart: startBlockId === block.id,
          isSelected: selectedBlockId === block.id,
          isMultiSelected: selectedBlockIds.has(block.id),
          isConnectionTarget: connectionMode !== null && connectionMode.fromBlockId !== block.id,
          outgoingEdgesCount: blockEdges.length,
          hasPassEdge,
          hasFailEdge,
          onEdit: () => {
            setSelectedBlockId(block.id);
            setShowBlockEditor(true);
          },
          onDelete: () => deleteBlock(block.id),
          onStartConnection: () => setConnectionMode({ fromBlockId: block.id }),
        },
      };
    });
  }, [selectedBlockId, selectedBlockIds, connectionMode, graph.edges]);

  // Convert graph edges to React Flow edges
  const graphEdgesToFlowEdges = useCallback((graphEdges: Edge[]): ReactFlowEdge[] => {
    const edgeColors = {
      pass: '#10b981',   // emerald-500
      fail: '#ef4444',   // red-500
      normal: '#6366f1', // indigo-500
    };
    const edgeLabels = {
      pass: 'Pass',
      fail: 'Fail',
      normal: undefined,
    };

    return graphEdges.map((edge, index) => {
      const edgeType = getEdgeType(edge.condition);
      const color = edgeColors[edgeType];
      const label = edgeLabels[edgeType];

      return {
        id: edge.id || `edge-${edge.from}-${edge.to}-${index}`,
        source: edge.from,
        target: edge.to,
        sourceHandle: edgeType !== 'normal' ? edgeType : undefined,
        type: 'smoothstep',
        animated: true,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        label,
        labelStyle: { fill: color, fontWeight: 600, fontSize: 12 },
        labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
        labelBgPadding: [4, 8] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
  }, []);

  // Sync graph state with React Flow nodes/edges
  useEffect(() => {
    const newNodes = blocksToNodes(graph.blocks, graph.startBlockId);
    const newEdges = graphEdgesToFlowEdges(graph.edges);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [graph, blocksToNodes, graphEdgesToFlowEdges, setNodes, setEdges]);

  useEffect(() => {
    loadJourney();
  }, [moduleId, journeyVersionId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
  };

  const loadJourney = async () => {
    const { data: module } = await supabase
      .from('modules')
      .select('title, track_id')
      .eq('id', moduleId)
      .single();

    if (module) {
      setModuleName(module.title);

      if (module.track_id) {
        const { data: siblingModules } = await supabase
          .from('modules')
          .select(`
            id,
            title,
            description,
            order_index,
            journey_versions (
              id,
              graph_json,
              status,
              updated_at
            )
          `)
          .eq('track_id', module.track_id)
          .order('order_index');

        if (siblingModules && siblingModules.length > 0) {
          const context: TrackModuleContext[] = siblingModules.map((m: any) => {
            // Get the best version: prefer published, otherwise most recently updated
            const versions = m.journey_versions || [];
            let bestVersion = null;
            
            if (versions.length > 0) {
              // First try to find a published version
              const publishedVersion = versions.find((v: any) => v.status === 'published');
              if (publishedVersion) {
                bestVersion = publishedVersion;
              } else {
                // Fall back to most recently updated version
                bestVersion = versions.sort((a: any, b: any) => 
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                )[0];
              }
            }
            
            return {
              moduleId: m.id,
              title: m.title,
              description: m.description,
              orderIndex: m.order_index,
              isCurrent: m.id === moduleId,
              graph: bestVersion?.graph_json as GraphDefinition || null,
            };
          });
          setTrackModulesContext(context);
        }
      }
    }

    if (journeyVersionId) {
      const { data: version } = await supabase
        .from('journey_versions')
        .select('graph_json')
        .eq('id', journeyVersionId)
        .single();

      if (version?.graph_json) {
        const loadedGraph = version.graph_json as GraphDefinition;
        // Auto-layout blocks that don't have positions
        const blocksWithPositions = loadedGraph.blocks.map((block, index) => {
          if (!block.ui?.position) {
            return {
              ...block,
              ui: {
                ...block.ui,
                position: { x: 400, y: 100 + index * 200 },
              },
            };
          }
          return block;
        });
        setGraph({ ...loadedGraph, blocks: blocksWithPositions });
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
    }
  };

  const saveJourney = async (): Promise<string | null> => {
    setIsSaving(true);
    let savedVersionId = versionId;

    // Sync node positions back to graph before saving
    const blocksWithPositions = graph.blocks.map(block => {
      const node = nodes.find(n => n.id === block.id);
      if (node) {
        return {
          ...block,
          ui: {
            ...block.ui,
            position: node.position,
          },
        };
      }
      return block;
    });

    const graphToSave = { ...graph, blocks: blocksWithPositions };

    try {
      if (versionId) {
        const { error } = await supabase
          .from('journey_versions')
          .update({ graph_json: graphToSave })
          .eq('id', versionId);

        if (error) throw error;
      } else {
        const { data: newVersion, error } = await supabase
          .from('journey_versions')
          .insert({
            module_id: moduleId,
            version: 1,
            status: 'draft',
            graph_json: graphToSave,
          })
          .select()
          .single();

        if (error) throw error;

        if (newVersion) {
          setVersionId(newVersion.id);
          savedVersionId = newVersion.id;
        }
      }

      setGraph(graphToSave);
      setIsDirty(false);
      showToast('success', 'Journey saved successfully');
      return savedVersionId;
    } catch (error) {
      console.error('Save error:', error);
      showToast('error', 'Failed to save journey');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const publishJourney = async () => {
    if (graph.blocks.length === 0) {
      showToast('error', 'Cannot publish an empty journey. Add some blocks first.');
      return;
    }

    setIsPublishing(true);

    try {
      let publishVersionId = versionId;

      if (!publishVersionId || isDirty) {
        publishVersionId = await saveJourney();
      }

      if (!publishVersionId) {
        throw new Error('Failed to save journey before publishing');
      }

      const { error: publishError } = await supabase
        .from('journey_versions')
        .update({ status: 'published' })
        .eq('id', publishVersionId);

      if (publishError) throw publishError;

      const { data: module } = await supabase
        .from('modules')
        .select('track_id')
        .eq('id', moduleId)
        .single();

      if (module?.track_id) {
        const { error: trackError } = await supabase
          .from('tracks')
          .update({ published_version_id: publishVersionId })
          .eq('id', module.track_id);

        if (trackError) throw trackError;
      }

      setIsDirty(false);
      showToast('success', 'Journey published successfully! Learners can now access it.');
    } catch (error) {
      console.error('Publish error:', error);
      showToast('error', 'Failed to publish journey. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const addBlock = useCallback((type: BlockType, position?: { x: number; y: number }) => {
    const id = `block_${Date.now()}`;
    
    // Calculate position: use provided position or auto-calculate
    let blockPosition = position;
    if (!blockPosition) {
      if (graph.blocks.length === 0) {
        blockPosition = { x: 400, y: 100 };
      } else {
        const lastBlock = graph.blocks[graph.blocks.length - 1];
        const lastNode = nodes.find(n => n.id === lastBlock.id);
        const lastPosition = lastNode?.position || lastBlock.ui?.position || { x: 400, y: 0 };
        blockPosition = { x: lastPosition.x, y: lastPosition.y + 200 };
      }
    }

    const newBlock: Block = {
      id,
      type,
      content: getDefaultContent(type),
      ui: { position: blockPosition },
    };

    const updatedBlocks = [...graph.blocks, newBlock];
    const startBlockId = graph.startBlockId || id;

    // Auto-connect to the last block
    const updatedEdges = [...graph.edges];
    if (graph.blocks.length > 0 && !graph.edges.some(e => e.to === id)) {
      const lastBlock = graph.blocks[graph.blocks.length - 1];
      if (!graph.edges.some(e => e.from === lastBlock.id)) {
        updatedEdges.push({ from: lastBlock.id, to: id });
      }
    }

    setGraph({ ...graph, blocks: updatedBlocks, edges: updatedEdges, startBlockId });
    setSelectedBlockId(id);
    setShowBlockEditor(true);
    setIsDirty(true);
  }, [graph, nodes]);

  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    const updatedBlocks = graph.blocks.map((b) =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    setGraph({ ...graph, blocks: updatedBlocks });
    setIsDirty(true);
  }, [graph]);

  const deleteBlock = useCallback((blockId: string) => {
    const updatedBlocks = graph.blocks.filter((b) => b.id !== blockId);
    const updatedEdges = graph.edges.filter(
      (e) => e.from !== blockId && e.to !== blockId
    );
    const startBlockId = graph.startBlockId === blockId
      ? updatedBlocks[0]?.id || ''
      : graph.startBlockId;

    setGraph({ ...graph, blocks: updatedBlocks, edges: updatedEdges, startBlockId });
    setSelectedBlockId(null);
    setShowBlockEditor(false);
    setIsDirty(true);
  }, [graph]);

  const bulkDeleteBlocks = useCallback(() => {
    const count = selectedBlockIds.size;
    const blockNames = graph.blocks
      .filter(b => selectedBlockIds.has(b.id))
      .slice(0, 5)
      .map(b => (b.content as { title?: string })?.title || 'Untitled')
      .join(', ');
    const message = count <= 5
      ? `Delete ${count} block${count > 1 ? 's' : ''} (${blockNames})?`
      : `Delete ${count} blocks (${blockNames}, and ${count - 5} more)?`;
    
    if (!confirm(`${message}\n\nAll connections to these blocks will also be removed. This action cannot be undone.`)) return;

    setIsBulkDeleting(true);
    try {
      const updatedBlocks = graph.blocks.filter(b => !selectedBlockIds.has(b.id));
      const updatedEdges = graph.edges.filter(
        e => !selectedBlockIds.has(e.from) && !selectedBlockIds.has(e.to)
      );
      
      let newStartBlockId = graph.startBlockId;
      if (selectedBlockIds.has(graph.startBlockId)) {
        newStartBlockId = updatedBlocks[0]?.id || '';
      }

      setGraph({ ...graph, blocks: updatedBlocks, edges: updatedEdges, startBlockId: newStartBlockId });
      setSelectedBlockIds(new Set());
      setSelectedBlockId(null);
      setShowBlockEditor(false);
      setIsDirty(true);
      showToast('success', `Successfully deleted ${count} block${count > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error bulk deleting blocks:', error);
      showToast('error', 'Failed to delete some blocks. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [graph, selectedBlockIds]);

  const toggleBlockSelection = useCallback((blockId: string) => {
    const newSelection = new Set(selectedBlockIds);
    if (newSelection.has(blockId)) {
      newSelection.delete(blockId);
    } else {
      newSelection.add(blockId);
    }
    setSelectedBlockIds(newSelection);
  }, [selectedBlockIds]);

  const selectAllBlocks = useCallback(() => {
    setSelectedBlockIds(new Set(graph.blocks.map(b => b.id)));
  }, [graph.blocks]);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
  }, []);

  const addGraphEdge = useCallback((fromId: string, toId: string) => {
    const existingEdge = graph.edges.find(
      (e) => e.from === fromId && e.to === toId
    );
    if (existingEdge || fromId === toId) return;

    const newEdge: Edge = { from: fromId, to: toId };
    setGraph({ ...graph, edges: [...graph.edges, newEdge] });
    setIsDirty(true);
  }, [graph]);

  const removeGraphEdge = useCallback((fromId: string, toId: string) => {
    const updatedEdges = graph.edges.filter(
      (e) => !(e.from === fromId && e.to === toId)
    );
    setGraph({ ...graph, edges: updatedEdges });
    setIsDirty(true);
  }, [graph]);

  const setStartBlock = useCallback((blockId: string) => {
    setGraph({ ...graph, startBlockId: blockId });
    setIsDirty(true);
  }, [graph]);

  // Handle React Flow connections
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      addGraphEdge(connection.source, connection.target);
    }
  }, [addGraphEdge]);

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<BlockNodeData>) => {
    if (connectionMode) {
      if (connectionMode.fromBlockId !== node.id) {
        addGraphEdge(connectionMode.fromBlockId, node.id);
      }
      setConnectionMode(null);
    } else {
      setSelectedBlockId(node.id);
      setShowBlockEditor(true);
    }
  }, [connectionMode, addGraphEdge]);

  // Handle node drag stop - update positions
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node<BlockNodeData>) => {
    const updatedBlocks = graph.blocks.map(block => {
      if (block.id === node.id) {
        return {
          ...block,
          ui: {
            ...block.ui,
            position: node.position,
          },
        };
      }
      return block;
    });
    setGraph(prev => ({ ...prev, blocks: updatedBlocks }));
    setIsDirty(true);
  }, [graph.blocks]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((deletedEdges: ReactFlowEdge[]) => {
    deletedEdges.forEach(edge => {
      removeGraphEdge(edge.source, edge.target);
    });
  }, [removeGraphEdge]);

  // Drag and drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow-type') as BlockType;
    if (!type) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addBlock(type, position);
  }, [screenToFlowPosition, addBlock]);

  const onDragStart = useCallback((event: React.DragEvent, type: BlockType) => {
    event.dataTransfer.setData('application/reactflow-type', type);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleAIGenerate = (generatedGraph: GraphDefinition) => {
    // Auto-layout generated blocks
    const blocksWithPositions = generatedGraph.blocks.map((block, index) => ({
      ...block,
      ui: {
        ...block.ui,
        position: block.ui?.position || { x: 400, y: 100 + index * 200 },
      },
    }));
    setGraph({ ...generatedGraph, blocks: blocksWithPositions });
    setShowAIGenerator(false);
    setIsDirty(true);
    showToast('success', 'AI-generated content added to journey');
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  const selectedBlock = graph.blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
          toast.type === 'error' ? 'bg-error/20 border-error/30 text-error' :
          'bg-primary-500/20 border-primary-500/30 text-primary-300'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> :
           toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
           <Loader2 className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-lg font-semibold text-white">{moduleName}</h1>
              <p className="text-xs text-slate-500">
                {graph.blocks.length} blocks, {graph.edges.length} connections
                {isDirty && <span className="text-warning ml-2">Unsaved changes</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedBlockIds.size > 0 && (
              <button
                onClick={bulkDeleteBlocks}
                disabled={isBulkDeleting}
                className="flex items-center gap-2 px-3 py-1.5 bg-error text-white rounded-lg text-sm hover:bg-error/90 disabled:opacity-50 transition-colors"
              >
                {isBulkDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete {selectedBlockIds.size}
              </button>
            )}

            <button
              onClick={() => setShowAIGenerator(true)}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>

            <button
              onClick={saveJourney}
              disabled={isSaving || !isDirty || isBulkDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={publishJourney}
              disabled={isPublishing || graph.blocks.length === 0 || isBulkDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isPublishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with draggable block types */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Drag blocks to canvas</h2>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map(({ type, label, icon: Icon, color }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => onDragStart(e, type)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-white">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">Blocks List</h2>
              {graph.blocks.length > 0 && (
                <div className="flex items-center gap-1">
                  {selectedBlockIds.size > 0 ? (
                    <button
                      onClick={clearBlockSelection}
                      className="text-xs px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
                    >
                      Clear ({selectedBlockIds.size})
                    </button>
                  ) : (
                    <button
                      onClick={selectAllBlocks}
                      className="text-xs px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
                    >
                      Select All
                    </button>
                  )}
                </div>
              )}
            </div>
            {graph.blocks.length === 0 ? (
              <p className="text-xs text-slate-500">No blocks yet. Drag blocks to the canvas or use AI generate.</p>
            ) : (
              <div className="space-y-2">
                {graph.blocks.map((block, index) => {
                  const blockType = BLOCK_TYPES.find((bt) => bt.type === block.type);
                  const Icon = blockType?.icon || BookOpen;
                  const isStart = graph.startBlockId === block.id;
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <div
                      key={block.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                        selectedBlockIds.has(block.id)
                          ? 'bg-primary-600/20 border border-primary-500'
                          : isSelected
                          ? 'bg-primary-600/10 border border-primary-400'
                          : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedBlockId(block.id);
                        setShowBlockEditor(true);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBlockIds.has(block.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleBlockSelection(block.id);
                        }}
                        disabled={isBulkDeleting}
                        className="w-4 h-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-900"
                      />
                      <div className={`w-6 h-6 ${blockType?.color || 'bg-slate-600'} rounded flex items-center justify-center`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {(block.content as { title?: string })?.title || `${blockType?.label || 'Block'} ${index + 1}`}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          {isStart && <span className="text-emerald-400">Start</span>}
                          {!isStart && <span>{blockType?.label}</span>}
                        </div>
                      </div>
                      {!isStart && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setStartBlock(block.id); }}
                          disabled={isBulkDeleting}
                          className="p-1 text-slate-500 hover:text-emerald-400 rounded disabled:opacity-50"
                          title="Set as start"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {connectionMode && (
            <div className="p-3 bg-primary-600/20 border-t border-primary-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary-300">Click a block to connect</span>
                <button
                  onClick={() => setConnectionMode(null)}
                  className="text-xs text-primary-400 hover:text-primary-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* React Flow Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            onEdgesDelete={onEdgesDelete}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-slate-900"
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={['Backspace', 'Delete']}
            panOnDrag={true}
            selectionOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={true}
          >
            <Background color="#334155" gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const block = graph.blocks.find(b => b.id === node.id);
                if (!block) return '#475569';
                const blockType = BLOCK_TYPES.find(bt => bt.type === block.type);
                // Return hex colors based on block type
                switch (block.type) {
                  case 'read': return '#6366f1';
                  case 'video': return '#f43f5e';
                  case 'image': return '#10b981';
                  case 'quiz': return '#a855f7';
                  case 'mission': return '#f97316';
                  case 'form': return '#14b8a6';
                  case 'ai_help': return '#06b6d4';
                  case 'checkpoint': return '#eab308';
                  case 'animation': return '#ec4899';
                  case 'code': return '#475569';
                  case 'exercise': return '#8b5cf6';
                  case 'resource': return '#6366f1';
                  default: return '#475569';
                }
              }}
              maskColor="rgba(15, 23, 42, 0.8)"
              className="bg-slate-800 border border-slate-700 rounded-lg"
            />
            
            {/* Empty state - Using Panel for proper pointer event handling */}
            {graph.blocks.length === 0 && (
              <Panel position="center" className="pointer-events-none">
                <div className="text-center pointer-events-auto">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-400 mb-2">Start Building Your Journey</h3>
                  <p className="text-slate-500 mb-4 max-w-md">
                    Drag blocks from the sidebar to create your learning path, or use AI to generate a complete course outline.
                  </p>
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate with AI
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {showBlockEditor && selectedBlock && (
          <aside className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <BlockEditor
              block={selectedBlock}
              allBlocks={graph.blocks}
              edges={graph.edges}
              onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
              onAddEdge={(toId, condition) => {
                const newEdge: Edge = { from: selectedBlock.id, to: toId, condition };
                setGraph({ ...graph, edges: [...graph.edges.filter(e => !(e.from === selectedBlock.id && e.to === toId)), newEdge] });
                setIsDirty(true);
              }}
              onRemoveEdge={(toId) => {
                setGraph({ ...graph, edges: graph.edges.filter(e => !(e.from === selectedBlock.id && e.to === toId)) });
                setIsDirty(true);
              }}
              onClose={() => { setShowBlockEditor(false); setSelectedBlockId(null); }}
            />
          </aside>
        )}
      </div>

      {showAIGenerator && (
        <AIContentGenerator
          onGenerate={handleAIGenerate}
          onClose={() => setShowAIGenerator(false)}
          existingGraph={graph}
          trackModulesContext={trackModulesContext}
          currentModuleId={moduleId}
        />
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
export function JourneyBuilder(props: JourneyBuilderProps) {
  return (
    <ReactFlowProvider>
      <JourneyBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function getDefaultContent(type: BlockType): Block['content'] {
  switch (type) {
    case 'read':
      return { title: 'New Reading', markdown: '# Title\n\nYour content here...', estimatedReadTime: 3 };
    case 'video':
      return { title: 'New Video', url: '' };
    case 'image':
      return { title: 'New Image', url: '', caption: '', alt: '' };
    case 'quiz':
      return { title: 'Knowledge Check', questions: [], passingScore: 50 };
    case 'mission':
      return { title: 'New Mission', steps: [] };
    case 'form':
      return { title: 'New Form', fields: [] };
    case 'ai_help':
      return { title: 'AI Help', mode: 'targeted_remediation' };
    case 'checkpoint':
      return { title: 'Checkpoint' };
    case 'animation':
      return { title: 'New Animation', animationType: 'lottie', url: '' };
    case 'code':
      return { title: 'Code Example', code: '// Your code here', language: 'javascript', showLineNumbers: true };
    case 'exercise':
      return { title: 'Practice Exercise', problem: '', solution: '', hints: [] };
    case 'resource':
      return { title: 'Resources', resources: [] };
    default:
      return { title: 'New Block' };
  }
}
