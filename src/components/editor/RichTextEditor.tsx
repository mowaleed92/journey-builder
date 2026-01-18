import { useState, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Image,
  Video,
  Link,
  Quote,
  Code,
  AlignRight,
  AlignLeft,
  Undo,
  Redo,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  direction?: 'rtl' | 'ltr';
  placeholder?: string;
  className?: string;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}

function ToolbarButton({ icon, onClick, active, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  direction = 'rtl',
  placeholder = 'ابدأ الكتابة...',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMediaModal, setShowMediaModal] = useState<'image' | 'video' | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertMedia = useCallback((type: 'image' | 'video') => {
    if (!mediaUrl) return;

    let html = '';
    if (type === 'image') {
      html = `<img src="${mediaUrl}" alt="${mediaAlt}" class="inline-media rounded-lg max-w-full my-2" />`;
    } else {
      if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
        const videoId = mediaUrl.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)?.[1];
        if (videoId) {
          html = `<iframe src="https://www.youtube.com/embed/${videoId}" class="inline-media rounded-lg w-full aspect-video my-2" frameborder="0" allowfullscreen></iframe>`;
        }
      } else {
        html = `<video src="${mediaUrl}" controls class="inline-media rounded-lg max-w-full my-2"></video>`;
      }
    }

    if (html) {
      document.execCommand('insertHTML', false, html);
      handleInput();
    }

    setShowMediaModal(null);
    setMediaUrl('');
    setMediaAlt('');
  }, [mediaUrl, mediaAlt, handleInput]);

  const insertLink = useCallback(() => {
    const url = prompt('أدخل الرابط:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-700 bg-slate-900/50">
        <ToolbarButton
          icon={<Bold className="w-4 h-4" />}
          onClick={() => execCommand('bold')}
          title="غامق"
        />
        <ToolbarButton
          icon={<Italic className="w-4 h-4" />}
          onClick={() => execCommand('italic')}
          title="مائل"
        />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <ToolbarButton
          icon={<Heading1 className="w-4 h-4" />}
          onClick={() => execCommand('formatBlock', 'h1')}
          title="عنوان رئيسي"
        />
        <ToolbarButton
          icon={<Heading2 className="w-4 h-4" />}
          onClick={() => execCommand('formatBlock', 'h2')}
          title="عنوان فرعي"
        />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <ToolbarButton
          icon={<List className="w-4 h-4" />}
          onClick={() => execCommand('insertUnorderedList')}
          title="قائمة نقطية"
        />
        <ToolbarButton
          icon={<ListOrdered className="w-4 h-4" />}
          onClick={() => execCommand('insertOrderedList')}
          title="قائمة مرقمة"
        />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <ToolbarButton
          icon={<Image className="w-4 h-4" />}
          onClick={() => setShowMediaModal('image')}
          title="إدراج صورة"
        />
        <ToolbarButton
          icon={<Video className="w-4 h-4" />}
          onClick={() => setShowMediaModal('video')}
          title="إدراج فيديو"
        />
        <ToolbarButton
          icon={<Link className="w-4 h-4" />}
          onClick={insertLink}
          title="إدراج رابط"
        />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <ToolbarButton
          icon={<Quote className="w-4 h-4" />}
          onClick={() => execCommand('formatBlock', 'blockquote')}
          title="اقتباس"
        />
        <ToolbarButton
          icon={<Code className="w-4 h-4" />}
          onClick={() => execCommand('formatBlock', 'pre')}
          title="كود"
        />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <ToolbarButton
          icon={direction === 'rtl' ? <AlignRight className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
          onClick={() => {
            if (editorRef.current) {
              editorRef.current.dir = editorRef.current.dir === 'rtl' ? 'ltr' : 'rtl';
            }
          }}
          title="تغيير الاتجاه"
        />
        <div className="flex-1" />
        <ToolbarButton
          icon={<Undo className="w-4 h-4" />}
          onClick={() => execCommand('undo')}
          title="تراجع"
        />
        <ToolbarButton
          icon={<Redo className="w-4 h-4" />}
          onClick={() => execCommand('redo')}
          title="إعادة"
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        dir={direction}
        className={`min-h-[200px] p-4 outline-none rich-text-content ${direction === 'rtl' ? 'rtl' : ''}`}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        style={{
          minHeight: '200px',
        }}
      />

      {showMediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">
              {showMediaModal === 'image' ? 'إدراج صورة' : 'إدراج فيديو'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {showMediaModal === 'image' ? 'رابط الصورة' : 'رابط الفيديو'}
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={showMediaModal === 'image' ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>

              {showMediaModal === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    النص البديل (اختياري)
                  </label>
                  <input
                    type="text"
                    value={mediaAlt}
                    onChange={(e) => setMediaAlt(e.target.value)}
                    placeholder="وصف الصورة"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {showMediaModal === 'video' && (
                <p className="text-sm text-slate-400">
                  يمكنك استخدام روابط YouTube أو روابط فيديو مباشرة
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMediaModal(null);
                  setMediaUrl('');
                  setMediaAlt('');
                }}
                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => insertMedia(showMediaModal)}
                disabled={!mediaUrl}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                إدراج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
