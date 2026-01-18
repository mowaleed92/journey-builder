import { useState, useEffect, useCallback } from 'react';
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
  ArrowRight,
  Settings2,
  Link2,
  Unlink,
  Image,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { BlockEditor } from './BlockEditor';
import { AIContentGenerator } from './AIContentGenerator';
import type { Block, Edge, GraphDefinition, BlockType } from '../../types/database';

interface JourneyBuilderProps {
  moduleId: string;
  journeyVersionId?: string;
  onBack: () => void;
}

type ExtendedBlockType = BlockType | 'image';

const BLOCK_TYPES: { type: ExtendedBlockType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'read', label: 'Read', icon: BookOpen, color: 'bg-blue-500' },
  { type: 'video', label: 'Video', icon: Video, color: 'bg-rose-500' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-emerald-500' },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'bg-purple-500' },
  { type: 'mission', label: 'Mission', icon: Target, color: 'bg-orange-500' },
  { type: 'form', label: 'Form', icon: FileText, color: 'bg-teal-500' },
  { type: 'ai_help', label: 'AI Help', icon: Bot, color: 'bg-cyan-500' },
  { type: 'checkpoint', label: 'Checkpoint', icon: Flag, color: 'bg-amber-500' },
  { type: 'animation', label: 'Animation', icon: Clapperboard, color: 'bg-pink-500' },
];

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

export function JourneyBuilder({ moduleId, journeyVersionId, onBack }: JourneyBuilderProps) {
  const [graph, setGraph] = useState<GraphDefinition>({ startBlockId: '', blocks: [], edges: [] });
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
      .select('title')
      .eq('id', moduleId)
      .single();

    if (module) {
      setModuleName(module.title);
    }

    if (journeyVersionId) {
      const { data: version } = await supabase
        .from('journey_versions')
        .select('graph_json')
        .eq('id', journeyVersionId)
        .single();

      if (version?.graph_json) {
        setGraph(version.graph_json as GraphDefinition);
      }
    }
  };

  const saveJourney = async (): Promise<string | null> => {
    setIsSaving(true);
    let savedVersionId = versionId;

    try {
      if (versionId) {
        const { error } = await supabase
          .from('journey_versions')
          .update({ graph_json: graph })
          .eq('id', versionId);

        if (error) throw error;
      } else {
        const { data: newVersion, error } = await supabase
          .from('journey_versions')
          .insert({
            module_id: moduleId,
            version: 1,
            status: 'draft',
            graph_json: graph,
          })
          .select()
          .single();

        if (error) throw error;

        if (newVersion) {
          setVersionId(newVersion.id);
          savedVersionId = newVersion.id;
        }
      }

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

  const addBlock = useCallback((type: ExtendedBlockType) => {
    const id = `block_${Date.now()}`;
    const newBlock: Block = {
      id,
      type: type as BlockType,
      content: getDefaultContent(type),
    };

    const updatedBlocks = [...graph.blocks, newBlock];
    const startBlockId = graph.startBlockId || id;

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
  }, [graph]);

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

  const addEdge = useCallback((fromId: string, toId: string) => {
    const existingEdge = graph.edges.find(
      (e) => e.from === fromId && e.to === toId
    );
    if (existingEdge || fromId === toId) return;

    const newEdge: Edge = { from: fromId, to: toId };
    setGraph({ ...graph, edges: [...graph.edges, newEdge] });
    setIsDirty(true);
  }, [graph]);

  const removeEdge = useCallback((fromId: string, toId: string) => {
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

  const handleBlockClick = (blockId: string) => {
    if (connectionMode) {
      if (connectionMode.fromBlockId !== blockId) {
        addEdge(connectionMode.fromBlockId, blockId);
      }
      setConnectionMode(null);
    } else {
      setSelectedBlockId(blockId);
      setShowBlockEditor(true);
    }
  };

  const handleAIGenerate = (generatedGraph: GraphDefinition) => {
    setGraph(generatedGraph);
    setShowAIGenerator(false);
    setIsDirty(true);
    showToast('success', 'AI-generated content added to journey');
  };

  const handleReorder = useCallback((newBlocks: Block[], newEdges: Edge[]) => {
    setGraph({ ...graph, blocks: newBlocks, edges: newEdges });
    setIsDirty(true);
  }, [graph]);

  const selectedBlock = graph.blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
          toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
          'bg-blue-500/20 border-blue-500/30 text-blue-300'
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
                {isDirty && <span className="text-amber-400 ml-2">Unsaved changes</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIGenerator(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-blue-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>

            <button
              onClick={saveJourney}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={publishJourney}
              disabled={isPublishing || graph.blocks.length === 0}
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
        <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Add Block</h2>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors group"
                >
                  <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-white">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Block Order</h2>
            {graph.blocks.length === 0 ? (
              <p className="text-xs text-slate-500">No blocks yet. Add blocks to build your journey.</p>
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
                      onClick={() => handleBlockClick(block.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500'
                          : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                      }`}
                    >
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
                      <div className="flex items-center gap-1">
                        {!isStart && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStartBlock(block.id); }}
                            className="p-1 text-slate-500 hover:text-emerald-400 rounded"
                            title="Set as start"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setConnectionMode({ fromBlockId: block.id }); }}
                          className={`p-1 rounded ${connectionMode?.fromBlockId === block.id ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-blue-400'}`}
                          title="Connect to another block"
                        >
                          <Link2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {connectionMode && (
            <div className="p-3 bg-blue-600/20 border-t border-blue-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-300">Click a block to connect</span>
                <button
                  onClick={() => setConnectionMode(null)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
            {graph.blocks.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-400 mb-2">Start Building Your Journey</h3>
                  <p className="text-slate-500 mb-4 max-w-md">
                    Add blocks from the sidebar to create your learning path, or use AI to generate a complete course outline.
                  </p>
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate with AI
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {graph.blocks.map((block, index) => {
                  const blockType = BLOCK_TYPES.find((bt) => bt.type === block.type);
                  const Icon = blockType?.icon || BookOpen;
                  const isStart = graph.startBlockId === block.id;
                  const isSelected = selectedBlockId === block.id;
                  const outgoingEdges = graph.edges.filter((e) => e.from === block.id);
                  const incomingEdges = graph.edges.filter((e) => e.to === block.id);

                  return (
                    <div key={block.id} className="relative">
                      {incomingEdges.length > 0 && index > 0 && (
                        <div className="flex items-center justify-center py-2">
                          <div className="w-0.5 h-6 bg-slate-700" />
                        </div>
                      )}

                      <div
                        onClick={() => handleBlockClick(block.id)}
                        className={`relative p-4 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-700 ring-2 ring-blue-500'
                            : 'bg-slate-800 hover:bg-slate-700/80'
                        } ${connectionMode && connectionMode.fromBlockId !== block.id ? 'ring-2 ring-blue-400/50 ring-dashed' : ''}`}
                      >
                        {isStart && (
                          <div className="absolute -top-2 left-4 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded">
                            START
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 ${blockType?.color || 'bg-slate-600'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {(block.content as { title?: string })?.title || `${blockType?.label || 'Block'} Block`}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {getBlockDescription(block)}
                            </p>

                            {outgoingEdges.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {outgoingEdges.map((edge) => {
                                  const targetBlock = graph.blocks.find((b) => b.id === edge.to);
                                  return (
                                    <div
                                      key={`${edge.from}-${edge.to}`}
                                      className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 rounded text-xs text-slate-400"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                      {(targetBlock?.content as { title?: string })?.title || 'Next block'}
                                      {edge.condition && (
                                        <span className="text-amber-400 ml-1">(conditional)</span>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeEdge(edge.from, edge.to); }}
                                        className="ml-1 text-slate-500 hover:text-red-400"
                                      >
                                        <Unlink className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); setShowBlockEditor(true); }}
                              className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
        />
      )}
    </div>
  );
}

function getDefaultContent(type: ExtendedBlockType): Block['content'] {
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
    default:
      return { title: 'New Block' };
  }
}

function getBlockDescription(block: Block): string {
  const content = block.content as Record<string, unknown>;

  switch (block.type) {
    case 'read':
      return `${content.estimatedReadTime || 0} min read`;
    case 'video':
      return content.url ? 'Video attached' : 'No video set';
    case 'image':
      return content.url ? 'Image attached' : 'No image set';
    case 'quiz':
      const questions = (content.questions as unknown[]) || [];
      return `${questions.length} question${questions.length !== 1 ? 's' : ''}, ${content.passingScore || 50}% to pass`;
    case 'mission':
      const steps = (content.steps as unknown[]) || [];
      return `${steps.length} step${steps.length !== 1 ? 's' : ''}`;
    case 'form':
      const fields = (content.fields as unknown[]) || [];
      return `${fields.length} field${fields.length !== 1 ? 's' : ''}`;
    case 'ai_help':
      return `Mode: ${content.mode || 'remediation'}`;
    case 'checkpoint':
      return 'Progress checkpoint';
    case 'animation':
      return content.animationType as string || 'Animation';
    default:
      return '';
  }
}
