import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  BookOpen,
  Video,
  HelpCircle,
  Target,
  Wand2,
  AlertCircle,
  CheckCircle,
  Globe,
  Search,
  Image,
  Code,
  Dumbbell,
  FolderOpen,
  FileText,
  Bot,
  Flag,
  Play,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAIEnabled, AIDisabledMessage } from '../../hooks/useAIEnabled';
import type { GraphDefinition } from '../../types/database';

interface TrackModuleContext {
  moduleId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  isCurrent: boolean;
  graph: GraphDefinition | null;
}

interface AIContentGeneratorProps {
  onGenerate: (graph: GraphDefinition) => void;
  onClose: () => void;
  existingGraph?: GraphDefinition;
  trackModulesContext?: TrackModuleContext[];
  currentModuleId?: string;
}

// Helper function to format the context preview (matching the edge function format)
function formatContextPreview(trackModulesContext: TrackModuleContext[]): string {
  const currentModule = trackModulesContext.find(m => m.isCurrent);
  const previousModules = trackModulesContext.filter(
    m => !m.isCurrent && m.orderIndex < (currentModule?.orderIndex ?? 999) && m.graph?.blocks?.length
  );
  
  if (previousModules.length === 0) {
    return 'No previous module content available.';
  }
  
  let preview = '';
  const totalModules = trackModulesContext.length;
  
  previousModules.forEach((module) => {
    preview += `\n${'═'.repeat(60)}\n`;
    preview += `MODULE ${module.orderIndex + 1} of ${totalModules}: "${module.title}"\n`;
    if (module.description) {
      preview += `Description: ${module.description}\n`;
    }
    preview += `${'═'.repeat(60)}\n\n`;
    
    if (module.graph && module.graph.blocks && module.graph.blocks.length > 0) {
      module.graph.blocks.forEach((block, index) => {
        const content = block.content as Record<string, unknown>;
        preview += `Block ${index + 1} [${block.type.toUpperCase()}] "${content.title || 'Untitled'}"\n`;
        preview += '---\n';
        
        if (block.type === 'read' && content.markdown) {
          const markdown = content.markdown as string;
          preview += markdown.length > 500 ? `${markdown.substring(0, 500)}...\n` : `${markdown}\n`;
        } else if (block.type === 'quiz' && Array.isArray(content.questions)) {
          preview += `Quiz with ${content.questions.length} questions\n`;
          (content.questions as Array<{prompt: string}>).slice(0, 2).forEach((q, qIdx) => {
            preview += `  ${qIdx + 1}. ${q.prompt}\n`;
          });
          if (content.questions.length > 2) {
            preview += `  ... and ${content.questions.length - 2} more questions\n`;
          }
        } else if (block.type === 'code' && content.code) {
          preview += `Language: ${content.language}\nCode snippet (${(content.code as string).split('\n').length} lines)\n`;
        } else if (block.type === 'mission' && Array.isArray(content.steps)) {
          preview += `Mission with ${content.steps.length} steps\n`;
        } else if (content.description) {
          preview += `${content.description}\n`;
        }
        preview += '---\n\n';
      });
    }
  });
  
  return preview.trim();
}

export function AIContentGenerator({ onGenerate, onClose, existingGraph, trackModulesContext = [], currentModuleId }: AIContentGeneratorProps) {
  const { enabled: aiEnabled, contentModel, isLoading: aiSettingsLoading } = useAIEnabled();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showContextPreview, setShowContextPreview] = useState(false);

  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('beginners');
  const [difficulty, setDifficulty] = useState('beginner');
  const [duration, setDuration] = useState(20);
  const [blockCount, setBlockCount] = useState(6);
  const [includeVideo, setIncludeVideo] = useState(true);
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [includeMission, setIncludeMission] = useState(true);
  const [includeImage, setIncludeImage] = useState(false);
  const [includeCode, setIncludeCode] = useState(true);
  const [includeExercise, setIncludeExercise] = useState(false);
  const [includeResource, setIncludeResource] = useState(false);
  const [includeForm, setIncludeForm] = useState(false);
  const [includeAIHelp, setIncludeAIHelp] = useState(true);
  const [includeCheckpoint, setIncludeCheckpoint] = useState(false);
  const [includeAnimation, setIncludeAnimation] = useState(false);
  const [enableWebResearch, setEnableWebResearch] = useState(true);
  const [generateImages, setGenerateImages] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o');

  const [generatedGraph, setGeneratedGraph] = useState<GraphDefinition | null>(null);

  // Update aiModel when settings load from hook
  useEffect(() => {
    if (!aiSettingsLoading && contentModel) {
      setAiModel(contentModel);
    }
  }, [aiSettingsLoading, contentModel]);

  const generateCourse = async () => {
    setIsGenerating(true);
    setError('');
    setGenerationStatus(enableWebResearch ? 'Researching topic on the web...' : 'Generating course...');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/course-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: 'outline',
            topic,
            targetAudience,
            difficulty,
            duration,
            blockCount,
            includeVideo,
            includeQuiz,
            includeMission,
            includeImage,
            includeCode,
            includeExercise,
            includeResource,
            includeForm,
            includeAIHelp,
            includeCheckpoint,
            includeAnimation,
            existingGraph,
            enableWebResearch,
            model: aiModel,
            trackModulesContext,
            generateImages: generateImages && includeImage,
          }),
        }
      );

      setGenerationStatus('Creating course structure...');

      if (!response.ok) {
        throw new Error('Failed to generate course');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.result && typeof data.result === 'object') {
        setGeneratedGraph(data.result as GraphDefinition);
        setStep(3);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (generatedGraph) {
      onGenerate(generatedGraph);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Course Generator</h2>
              <p className="text-sm text-slate-400">Create a complete course with AI assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Show message if AI is disabled */}
          {!aiSettingsLoading && !aiEnabled ? (
            <AIDisabledMessage />
          ) : aiSettingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : step === 1 && (
            <div className="space-y-6">
              {trackModulesContext.length > 1 && (() => {
                const currentModule = trackModulesContext.find(m => m.isCurrent);
                const previousModules = trackModulesContext.filter(
                  m => !m.isCurrent && m.orderIndex < (currentModule?.orderIndex ?? 999)
                );
                const previousModulesWithContent = previousModules.filter(m => m.graph?.blocks?.length);
                const emptyPreviousModules = previousModules.filter(m => !m.graph?.blocks?.length);
                const hasWarning = emptyPreviousModules.length > 0 && previousModules.length > 0;
                
                return (
                  <div className="space-y-3">
                    {/* Main track-aware notice */}
                    <div className={`flex items-start gap-3 p-4 border rounded-xl ${
                      hasWarning 
                        ? 'bg-amber-500/10 border-amber-500/20' 
                        : 'bg-purple-500/10 border-purple-500/20'
                    }`}>
                      {hasWarning ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className={`font-medium mb-1 ${hasWarning ? 'text-amber-300' : 'text-purple-300'}`}>
                          Track-Aware Generation
                        </div>
                        
                        {previousModulesWithContent.length > 0 ? (
                          <div className="text-sm text-slate-400 mb-2">
                            AI will reference FULL content from {previousModulesWithContent.length} previous module{previousModulesWithContent.length !== 1 ? 's' : ''} to ensure progressive learning.
                          </div>
                        ) : previousModules.length > 0 ? (
                          <div className="text-sm text-amber-400/80 mb-2">
                            Warning: No content found in previous modules. AI will generate standalone content.
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 mb-2">
                            This is the first module in the track.
                          </div>
                        )}
                        
                        {/* Module list with status indicators */}
                        <div className="space-y-1">
                          {trackModulesContext.map((module) => {
                            const isPrevious = !module.isCurrent && module.orderIndex < (currentModule?.orderIndex ?? 999);
                            const hasContent = module.graph?.blocks?.length;
                            const blockCount = module.graph?.blocks?.length || 0;
                            
                            return (
                              <div 
                                key={module.moduleId} 
                                className={`text-xs flex items-center gap-2 ${
                                  module.isCurrent 
                                    ? 'text-purple-300 font-medium' 
                                    : isPrevious && hasContent
                                      ? 'text-emerald-400'
                                      : isPrevious && !hasContent
                                        ? 'text-amber-400'
                                        : 'text-slate-500'
                                }`}
                              >
                                {isPrevious && hasContent && <CheckCircle className="w-3 h-3" />}
                                {isPrevious && !hasContent && <AlertTriangle className="w-3 h-3" />}
                                {!isPrevious && <div className="w-1.5 h-1.5 rounded-full bg-current ml-0.5" />}
                                
                                <span>Module {module.orderIndex + 1}: {module.title}</span>
                                
                                {hasContent && <span className="text-slate-500">({blockCount} blocks)</span>}
                                {isPrevious && !hasContent && <span className="text-amber-400/70">(empty)</span>}
                                {module.isCurrent && <span className="text-purple-400">(generating)</span>}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Context preview toggle */}
                        {previousModulesWithContent.length > 0 && (
                          <button
                            onClick={() => setShowContextPreview(!showContextPreview)}
                            className="mt-3 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {showContextPreview ? 'Hide' : 'Preview'} AI Context
                            {showContextPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Context preview panel */}
                    {showContextPreview && previousModulesWithContent.length > 0 && (
                      <div className="p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-300">Context Preview</h4>
                          <span className="text-xs text-slate-500">
                            {formatContextPreview(trackModulesContext).length.toLocaleString()} characters
                          </span>
                        </div>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono bg-slate-950/50 p-3 rounded-lg">
                          {formatContextPreview(trackModulesContext)}
                        </pre>
                      </div>
                    )}
                    
                    {/* Warning banner for empty modules */}
                    {hasWarning && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-300/80">
                          <span className="font-medium">Tip:</span> For best results, generate or add content to {emptyPreviousModules.map(m => `Module ${m.orderIndex + 1}`).join(', ')} first. 
                          This ensures the AI can build upon previous concepts.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {existingGraph && existingGraph.blocks.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-primary-300 mb-1">Building Upon Existing Content</div>
                    <div className="text-sm text-slate-400">
                      AI will see your {existingGraph.blocks.length} existing blocks and generate content that complements what you already have.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What do you want to teach?
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="e.g., Introduction to Machine Learning, How to use ChatGPT effectively, Basic Python programming..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="beginners">Complete Beginners</option>
                    <option value="students">Students</option>
                    <option value="professionals">Professionals</option>
                    <option value="technical">Technical Audience</option>
                    <option value="general">General Audience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!topic.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-900/50 rounded-xl">
                <h3 className="font-medium text-white mb-1">Topic</h3>
                <p className="text-slate-400">{topic}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 20)}
                    min={5}
                    max={120}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Number of Steps
                  </label>
                  <input
                    type="number"
                    value={blockCount}
                    onChange={(e) => setBlockCount(parseInt(e.target.value) || 6)}
                    min={3}
                    max={20}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Content Blocks */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Content Blocks
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeVideo}
                      onChange={(e) => setIncludeVideo(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Video className="w-5 h-5 text-rose-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Video Blocks</div>
                      <div className="text-xs text-slate-500">Add placeholder video sections</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeImage}
                      onChange={(e) => setIncludeImage(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Image className="w-5 h-5 text-emerald-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Image Blocks</div>
                      <div className="text-xs text-slate-500">Add placeholder images and diagrams</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeCode}
                      onChange={(e) => setIncludeCode(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Code className="w-5 h-5 text-cyan-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Code Snippets</div>
                      <div className="text-xs text-slate-500">Syntax-highlighted code examples</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeResource}
                      onChange={(e) => setIncludeResource(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Additional Resources</div>
                      <div className="text-xs text-slate-500">Curated links and downloads</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Interactive Blocks */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Interactive Blocks
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeQuiz}
                      onChange={(e) => setIncludeQuiz(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Quiz & Assessment</div>
                      <div className="text-xs text-slate-500">Test learner understanding with questions</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeMission}
                      onChange={(e) => setIncludeMission(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Target className="w-5 h-5 text-orange-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Hands-on Mission</div>
                      <div className="text-xs text-slate-500">Practical task for learners to complete</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeExercise}
                      onChange={(e) => setIncludeExercise(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Dumbbell className="w-5 h-5 text-violet-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Practice Exercises</div>
                      <div className="text-xs text-slate-500">Problems with hints and solutions</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeForm}
                      onChange={(e) => setIncludeForm(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <FileText className="w-5 h-5 text-warning" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Data Collection Forms</div>
                      <div className="text-xs text-slate-500">Gather learner input and surveys</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Support Blocks */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Support Blocks
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeAIHelp}
                      onChange={(e) => setIncludeAIHelp(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Bot className="w-5 h-5 text-primary-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">AI Help / Remediation</div>
                      <div className="text-xs text-slate-500">Personalized AI tutoring when struggling</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeCheckpoint}
                      onChange={(e) => setIncludeCheckpoint(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Flag className="w-5 h-5 text-accent" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Progress Checkpoints</div>
                      <div className="text-xs text-slate-500">Validate understanding before continuing</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeAnimation}
                      onChange={(e) => setIncludeAnimation(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Play className="w-5 h-5 text-pink-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Animations</div>
                      <div className="text-xs text-slate-500">Interactive visual animations</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  AI Research & Generation
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-500/10 to-accent/10 border border-primary-500/20 rounded-xl cursor-pointer hover:border-primary-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableWebResearch}
                      onChange={(e) => setEnableWebResearch(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500"
                    />
                    <Globe className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Web Research</div>
                      <div className="text-xs text-slate-400">
                        AI will search the web for the latest information on this topic to ensure accurate, up-to-date content
                      </div>
                    </div>
                    <Search className="w-4 h-4 text-blue-400/50" />
                  </label>

                  {includeImage && (
                    <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl cursor-pointer hover:border-emerald-500/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={generateImages}
                        onChange={(e) => setGenerateImages(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <Image className="w-5 h-5 text-emerald-400" />
                      <div className="flex-1">
                        <div className="text-white font-medium">Generate AI Images</div>
                        <div className="text-xs text-slate-400">
                          Automatically generate educational images/diagrams for image blocks using GPT-Image-1.5
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 text-emerald-400/50" />
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={generateCourse}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">{generationStatus}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Generate Course
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && generatedGraph && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="font-medium text-emerald-400">Course Generated!</div>
                  <div className="text-sm text-slate-400">
                    {generatedGraph.blocks.length} blocks created with proper flow
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Generated Structure</h3>
                <div className="space-y-2">
                  {generatedGraph.blocks.map((block, index) => {
                    const content = block.content as { title?: string };
                    const isStart = generatedGraph.startBlockId === block.id;

                    return (
                      <div
                        key={block.id}
                        className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {content?.title || block.type}
                            </span>
                            {isStart && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                Start
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">{block.type}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Use This Course
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step >= s ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
