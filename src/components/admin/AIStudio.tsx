import { useState } from 'react';
import {
  Sparkles,
  FileText,
  HelpCircle,
  Video,
  Loader2,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

type GenerationType = 'content' | 'quiz' | 'video_script';

export function AIStudio() {
  const [activeType, setActiveType] = useState<GenerationType>('content');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('beginners');
  const [existingContent, setExistingContent] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateContent = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setResult('');

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
            type: activeType,
            topic,
            targetAudience,
            existingContent: existingContent || undefined,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else if (data.result) {
        if (typeof data.result === 'string') {
          setResult(data.result);
        } else {
          setResult(JSON.stringify(data.result, null, 2));
        }
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const types = [
    { id: 'content' as GenerationType, label: 'Reading Content', icon: FileText, description: 'Generate educational markdown content' },
    { id: 'quiz' as GenerationType, label: 'Quiz Questions', icon: HelpCircle, description: 'Generate assessment questions with answers' },
    { id: 'video_script' as GenerationType, label: 'Video Script', icon: Video, description: 'Generate video narration scripts' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Content Studio</h1>
            <p className="text-slate-400">Generate educational content with AI assistance</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-slate-700 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                What to Generate
              </label>
              <div className="space-y-2">
                {types.map((type) => {
                  const Icon = type.icon;
                  const isActive = activeType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setActiveType(type.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isActive
                          ? 'bg-purple-600/20 border border-purple-500'
                          : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                      <div>
                        <div className={`font-medium ${isActive ? 'text-purple-300' : 'text-white'}`}>
                          {type.label}
                        </div>
                        <div className="text-xs text-slate-500">{type.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Topic / Subject
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="What topic should the content cover?"
              />
            </div>

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
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Existing Content (optional)
              </label>
              <textarea
                value={existingContent}
                onChange={(e) => setExistingContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Paste existing content to expand upon..."
              />
            </div>

            <button
              onClick={generateContent}
              disabled={!topic.trim() || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Generated Output</h2>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={generateContent}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isGenerating ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Generating content...</p>
                  <p className="text-sm text-slate-500 mt-1">This may take a moment</p>
                </div>
              </div>
            ) : result ? (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <pre className="text-slate-200 text-sm whitespace-pre-wrap font-mono">
                  {result}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Generated content will appear here</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Fill in the form and click Generate to start
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
