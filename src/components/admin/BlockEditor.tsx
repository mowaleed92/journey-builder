import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Video,
  Upload,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Image,
} from 'lucide-react';
import type { Block, Edge, ConditionGroup, QuizQuestion, FormField, MissionStep } from '../../types/database';

interface BlockEditorProps {
  block: Block;
  allBlocks: Block[];
  edges: Edge[];
  onUpdate: (updates: Partial<Block>) => void;
  onAddEdge: (toId: string, condition?: ConditionGroup) => void;
  onRemoveEdge: (toId: string) => void;
  onClose: () => void;
}

export function BlockEditor({ block, allBlocks, edges, onUpdate, onAddEdge, onRemoveEdge, onClose }: BlockEditorProps) {
  const [activeSection, setActiveSection] = useState<string>('content');

  const updateContent = (key: string, value: unknown) => {
    onUpdate({ content: { ...block.content, [key]: value } });
  };

  const outgoingEdges = edges.filter((e) => e.from === block.id);
  const availableTargets = allBlocks.filter(
    (b) => b.id !== block.id && !outgoingEdges.some((e) => e.to === b.id)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Edit Block</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={(block.content as { title?: string }).title || ''}
              onChange={(e) => updateContent('title', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Block title"
            />
          </div>

          <CollapsibleSection
            title="Content"
            isOpen={activeSection === 'content'}
            onToggle={() => setActiveSection(activeSection === 'content' ? '' : 'content')}
          >
            {renderContentEditor(block, updateContent)}
          </CollapsibleSection>

          <CollapsibleSection
            title="Connections"
            isOpen={activeSection === 'connections'}
            onToggle={() => setActiveSection(activeSection === 'connections' ? '' : 'connections')}
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Define what happens after this block.</p>

              {outgoingEdges.length > 0 && (
                <div className="space-y-2">
                  {outgoingEdges.map((edge) => {
                    const targetBlock = allBlocks.find((b) => b.id === edge.to);
                    return (
                      <div
                        key={`${edge.from}-${edge.to}`}
                        className="flex items-center justify-between p-2 bg-slate-900 rounded-lg group"
                      >
                        <span className="text-sm text-slate-300 flex-1">
                          {(targetBlock?.content as { title?: string })?.title || 'Unknown block'}
                        </span>
                        {edge.condition && (
                          <span className="text-xs text-amber-400 mr-2">Conditional</span>
                        )}
                        <button
                          onClick={() => onRemoveEdge(edge.to)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {availableTargets.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Connect to:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onAddEdge(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a block...</option>
                    {availableTargets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {(b.content as { title?: string })?.title || b.type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {block.type === 'quiz' && (
                <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Conditional Routing</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Add connections with conditions based on quiz score.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const passTarget = availableTargets[0];
                        if (passTarget) {
                          onAddEdge(passTarget.id, {
                            all: [{ fact: 'quiz.scorePercent', op: 'gte', value: 50 }],
                          });
                        }
                      }}
                      disabled={availableTargets.length === 0}
                      className="w-full px-3 py-2 text-sm bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 disabled:opacity-50 transition-colors"
                    >
                      {"Add \"Pass\" connection (score >= 50%)"}
                    </button>
                    <button
                      onClick={() => {
                        const failTarget = availableTargets[0];
                        if (failTarget) {
                          onAddEdge(failTarget.id, {
                            all: [{ fact: 'quiz.scorePercent', op: 'lt', value: 50 }],
                          });
                        }
                      }}
                      disabled={availableTargets.length === 0}
                      className="w-full px-3 py-2 text-sm bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30 disabled:opacity-50 transition-colors"
                    >
                      {"Add \"Fail\" connection (score < 50%)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 text-white hover:bg-slate-700 transition-colors"
      >
        <span className="font-medium">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="p-4 bg-slate-800/50">{children}</div>}
    </div>
  );
}

function renderContentEditor(
  block: Block,
  updateContent: (key: string, value: unknown) => void
) {
  const content = block.content as Record<string, unknown>;

  switch (block.type) {
    case 'read':
      return <ReadBlockEditor content={content} updateContent={updateContent} />;
    case 'video':
      return <VideoBlockEditor content={content} updateContent={updateContent} />;
    case 'image':
      return <ImageBlockEditor content={content} updateContent={updateContent} />;
    case 'quiz':
      return <QuizBlockEditor content={content} updateContent={updateContent} />;
    case 'mission':
      return <MissionBlockEditor content={content} updateContent={updateContent} />;
    case 'form':
      return <FormBlockEditor content={content} updateContent={updateContent} />;
    case 'ai_help':
      return <AIHelpBlockEditor content={content} updateContent={updateContent} />;
    case 'checkpoint':
      return <CheckpointBlockEditor content={content} updateContent={updateContent} />;
    case 'animation':
      return <AnimationBlockEditor content={content} updateContent={updateContent} />;
    default:
      return <p className="text-slate-500">No editor available for this block type.</p>;
  }
}

function ReadBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const generateContent = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
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
            type: 'content',
            topic: aiPrompt,
            existingContent: content.markdown || '',
          }),
        }
      );
      const data = await response.json();
      if (data.result) {
        updateContent('markdown', data.result);
        setShowAiInput(false);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Content (Markdown)</label>
        <textarea
          value={(content.markdown as string) || ''}
          onChange={(e) => updateContent('markdown', e.target.value)}
          rows={12}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
          placeholder="# Heading&#10;&#10;Your content here..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Est. Read Time (minutes)</label>
        <input
          type="number"
          value={(content.estimatedReadTime as number) || 3}
          onChange={(e) => updateContent('estimatedReadTime', parseInt(e.target.value) || 3)}
          min={1}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {showAiInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="What topic should this content cover?"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiInput(false)}
              className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generateContent}
              disabled={isGenerating || !aiPrompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAiInput(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Content with AI
        </button>
      )}
    </div>
  );
}

function VideoBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const generateScript = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
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
            type: 'video_script',
            topic: aiPrompt,
            duration: 5,
          }),
        }
      );
      const data = await response.json();
      if (data.result) {
        updateContent('transcript', data.result);
        updateContent('description', `Video script: ${aiPrompt}`);
        setShowAiInput(false);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('url')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            inputMode === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          URL
        </button>
        <button
          onClick={() => setInputMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            inputMode === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {inputMode === 'url' ? (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Video URL</label>
          <input
            type="url"
            value={(content.url as string) || ''}
            onChange={(e) => updateContent('url', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://youtube.com/watch?v=... or video URL"
          />
          <p className="text-xs text-slate-500 mt-1">Supports YouTube, Vimeo, and direct video URLs</p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
          <Video className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-2">Drag and drop or click to upload</p>
          <input type="file" accept="video/*" className="hidden" />
          <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
            Choose File
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Transcript / Script</label>
        <textarea
          value={(content.transcript as string) || ''}
          onChange={(e) => updateContent('transcript', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Video transcript or script..."
        />
      </div>

      {showAiInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="What should the video script cover?"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiInput(false)}
              className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generateScript}
              disabled={isGenerating || !aiPrompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAiInput(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Script with AI
        </button>
      )}
    </div>
  );
}

function ImageBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  const SAMPLE_IMAGES = [
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
  ];

  const [showGallery, setShowGallery] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Image URL</label>
        <input
          type="url"
          value={(content.url as string) || ''}
          onChange={(e) => updateContent('url', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {content.url ? (
        <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
          <img
            src={content.url as string}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowGallery(!showGallery)}
          className="w-full aspect-video bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-slate-600 transition-colors"
        >
          <Image className="w-8 h-8 text-slate-600" />
          <span className="text-sm text-slate-400">Choose from gallery or paste URL above</span>
        </button>
      )}

      {showGallery && !content.url && (
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_IMAGES.map((url, i) => (
            <button
              key={i}
              onClick={() => {
                updateContent('url', url);
                setShowGallery(false);
              }}
              className="aspect-video rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Caption (optional)</label>
        <input
          type="text"
          value={(content.caption as string) || ''}
          onChange={(e) => updateContent('caption', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Image caption..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Alt Text</label>
        <input
          type="text"
          value={(content.alt as string) || ''}
          onChange={(e) => updateContent('alt', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the image for accessibility..."
        />
      </div>
    </div>
  );
}

function QuizBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  const questions = (content.questions as QuizQuestion[]) || [];
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      prompt: '',
      choices: ['', '', '', ''],
      correctIndex: 0,
      tags: [],
    };
    updateContent('questions', [...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = questions.map((q, i) => (i === index ? { ...q, ...updates } : q));
    updateContent('questions', updated);
  };

  const removeQuestion = (index: number) => {
    updateContent('questions', questions.filter((_, i) => i !== index));
  };

  const generateQuestions = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
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
            type: 'quiz',
            topic: aiPrompt,
          }),
        }
      );
      const data = await response.json();
      if (data.result && Array.isArray(data.result)) {
        const newQuestions = data.result.map((q: QuizQuestion, i: number) => ({
          ...q,
          id: `q_${Date.now()}_${i}`,
        }));
        updateContent('questions', [...questions, ...newQuestions]);
        setShowAiInput(false);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-slate-300">Passing Score (%)</label>
        </div>
        <input
          type="number"
          value={(content.passingScore as number) || 50}
          onChange={(e) => updateContent('passingScore', parseInt(e.target.value) || 50)}
          min={0}
          max={100}
          className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-4">
        {questions.map((question, qIndex) => (
          <div key={question.id} className="p-3 bg-slate-900 rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-400">Q{qIndex + 1}</span>
              </div>
              <button
                onClick={() => removeQuestion(qIndex)}
                className="p-1 text-slate-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={question.prompt}
              onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Question..."
            />

            <div className="space-y-2">
              {question.choices.map((choice, cIndex) => (
                <div key={cIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={question.correctIndex === cIndex}
                    onChange={() => updateQuestion(qIndex, { correctIndex: cIndex })}
                    className="w-4 h-4 text-emerald-500"
                  />
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => {
                      const newChoices = [...question.choices];
                      newChoices[cIndex] = e.target.value;
                      updateQuestion(qIndex, { choices: newChoices });
                    }}
                    className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Option ${cIndex + 1}`}
                  />
                </div>
              ))}
            </div>

            <input
              type="text"
              value={question.explanation || ''}
              onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explanation (shown after answer)..."
            />

            <input
              type="text"
              value={question.tags.join(', ')}
              onChange={(e) => updateQuestion(qIndex, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tags (comma-separated)..."
            />
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Question
      </button>

      {showAiInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="What topic should the questions cover?"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiInput(false)}
              className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generateQuestions}
              disabled={isGenerating || !aiPrompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAiInput(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Questions with AI
        </button>
      )}
    </div>
  );
}

function MissionBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  const steps = (content.steps as MissionStep[]) || [];

  const addStep = () => {
    const newStep: MissionStep = {
      id: `step_${Date.now()}`,
      instruction: '',
      verificationMethod: 'self_report',
    };
    updateContent('steps', [...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<MissionStep>) => {
    const updated = steps.map((s, i) => (i === index ? { ...s, ...updates } : s));
    updateContent('steps', updated);
  };

  const removeStep = (index: number) => {
    updateContent('steps', steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
        <textarea
          value={(content.description as string) || ''}
          onChange={(e) => updateContent('description', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What is this mission about?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">External URL (optional)</label>
        <input
          type="url"
          value={(content.externalUrl as string) || ''}
          onChange={(e) => updateContent('externalUrl', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Steps</label>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-2 p-2 bg-slate-900 rounded-lg">
            <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs text-slate-400">
              {index + 1}
            </span>
            <input
              type="text"
              value={step.instruction}
              onChange={(e) => updateStep(index, { instruction: e.target.value })}
              className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Step instruction..."
            />
            <button
              onClick={() => removeStep(index)}
              className="p-1 text-slate-500 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Step
      </button>
    </div>
  );
}

function FormBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  const fields = (content.fields as FormField[]) || [];

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: '',
      required: false,
    };
    updateContent('fields', [...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    updateContent('fields', updated);
  };

  const removeField = (index: number) => {
    updateContent('fields', fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
        <textarea
          value={(content.description as string) || ''}
          onChange={(e) => updateContent('description', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Fields</label>
        {fields.map((field, index) => (
          <div key={field.id} className="p-2 bg-slate-900 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
                <option value="radio">Radio</option>
              </select>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Label..."
              />
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                onClick={() => removeField(index)}
                className="p-1 text-slate-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['text', 'textarea', 'select', 'checkbox', 'radio'] as FormField['type'][]).map((type) => (
          <button
            key={type}
            onClick={() => addField(type)}
            className="px-3 py-1 bg-slate-700 text-white text-sm rounded hover:bg-slate-600 transition-colors"
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}

function AIHelpBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mode</label>
        <select
          value={(content.mode as string) || 'targeted_remediation'}
          onChange={(e) => updateContent('mode', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="targeted_remediation">Targeted Remediation</option>
          <option value="open_chat">Open Chat</option>
          <option value="guided_explanation">Guided Explanation</option>
        </select>
        <p className="text-xs text-slate-500 mt-1">
          {content.mode === 'targeted_remediation'
            ? 'AI focuses on topics the learner struggled with'
            : content.mode === 'open_chat'
            ? 'Open-ended conversation about the material'
            : 'Step-by-step guided explanation'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Max Turns</label>
        <input
          type="number"
          value={(content.maxTurns as number) || 5}
          onChange={(e) => updateContent('maxTurns', parseInt(e.target.value) || 5)}
          min={1}
          max={20}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function CheckpointBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
        <textarea
          value={(content.description as string) || ''}
          onChange={(e) => updateContent('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What does this checkpoint evaluate?"
        />
      </div>

      <p className="text-xs text-slate-500">
        Checkpoints evaluate learner progress and can branch to different paths based on performance.
        Use the Connections section to set up conditional routing.
      </p>
    </div>
  );
}

function AnimationBlockEditor({
  content,
  updateContent,
}: {
  content: Record<string, unknown>;
  updateContent: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Animation Type</label>
        <select
          value={(content.animationType as string) || 'lottie'}
          onChange={(e) => updateContent('animationType', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="lottie">Lottie</option>
          <option value="video">Video</option>
          <option value="interactive">Interactive</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Animation URL</label>
        <input
          type="url"
          value={(content.url as string) || ''}
          onChange={(e) => updateContent('url', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://..."
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={(content.autoplay as boolean) ?? true}
            onChange={(e) => updateContent('autoplay', e.target.checked)}
          />
          Autoplay
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={(content.loop as boolean) ?? false}
            onChange={(e) => updateContent('loop', e.target.checked)}
          />
          Loop
        </label>
      </div>
    </div>
  );
}
