import { useState, useEffect } from 'react';
import {
  Video,
  Camera,
  Monitor,
  MonitorPlay,
  Search,
  Trash2,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  X,
  Clock,
  Calendar,
} from 'lucide-react';
import { useToast } from '../../hooks';
import { VideoRecorder } from './VideoRecorder';
import { BulkActionBar } from '../admin/BulkActionBar';
import { SelectableCard } from '../admin/SelectableCard';

interface RecordedVideo {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  duration_seconds: number;
  recording_type: 'camera' | 'screen' | 'camera_screen';
  thumbnail_path: string | null;
  is_public: boolean;
  created_at: string;
}

interface VideoLibraryProps {
  onSelect?: (video: RecordedVideo) => void;
  selectionMode?: boolean;
}

export function VideoLibrary({ onSelect, selectionMode = false }: VideoLibraryProps) {
  const { showToast } = useToast();
  const [videos, setVideos] = useState<RecordedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [filter, setFilter] = useState<'all' | 'camera' | 'screen' | 'camera_screen'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('../../lib/supabase');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('recorded_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingComplete = async (blob: Blob, mode: 'camera' | 'screen' | 'camera_screen') => {
    try {
      const { createClient } = await import('../../lib/supabase');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filename = `${user.id}/${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filename, blob, {
          contentType: 'video/webm',
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('recorded_videos')
        .insert({
          title: `تسجيل ${new Date().toLocaleDateString('ar-SA')}`,
          storage_path: filename,
          recording_type: mode,
          user_id: user.id,
          is_public: false,
        });

      if (insertError) throw insertError;

      showToast('success', 'تم حفظ الفيديو بنجاح');
      setShowRecorder(false);
      await loadVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      showToast('error', 'فشل في حفظ الفيديو. يرجى المحاولة مرة أخرى.');
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;

    setDeletingId(id);
    try {
      const { createClient } = await import('../../lib/supabase');
      const supabase = createClient();

      const video = videos.find(v => v.id === id);
      if (video?.storage_path) {
        await supabase.storage.from('videos').remove([video.storage_path]);
      }

      const { error } = await supabase
        .from('recorded_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('success', 'تم حذف الفيديو بنجاح');
      setVideos(videos.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting video:', error);
      showToast('error', 'فشل في حذف الفيديو. يرجى المحاولة مرة أخرى.');
    } finally {
      setDeletingId(null);
    }
  };

  const bulkDeleteVideos = async () => {
    const count = selectedVideoIds.size;
    const videoNames = videos
      .filter(v => selectedVideoIds.has(v.id))
      .slice(0, 3)
      .map(v => v.title)
      .join('، ');
    const message = count <= 3
      ? `حذف ${count} فيديو (${videoNames})؟`
      : `حذف ${count} فيديوهات (${videoNames}، و ${count - 3} أخرى)؟`;
    
    if (!confirm(`${message}\n\nلا يمكن التراجع عن هذا الإجراء.`)) return;

    setIsBulkDeleting(true);
    try {
      const { createClient } = await import('../../lib/supabase');
      const supabase = createClient();

      const videosToDelete = videos.filter(v => selectedVideoIds.has(v.id));
      
      // Delete from storage first
      const paths = videosToDelete.map(v => v.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('videos').remove(paths);
      }

      // Then delete from database
      const { error } = await supabase
        .from('recorded_videos')
        .delete()
        .in('id', Array.from(selectedVideoIds));
      
      if (error) throw error;

      showToast('success', `تم حذف ${count} فيديو بنجاح`);
      setSelectedVideoIds(new Set());
      await loadVideos();
    } catch (error) {
      console.error('Error bulk deleting videos:', error);
      showToast('error', 'فشل في حذف بعض الفيديوهات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideoIds);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideoIds(newSelection);
  };

  const selectAllVideos = () => {
    setSelectedVideoIds(new Set(filteredVideos.map(v => v.id)));
  };

  const clearVideoSelection = () => {
    setSelectedVideoIds(new Set());
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'camera':
        return <Camera className="w-4 h-4" />;
      case 'screen':
        return <Monitor className="w-4 h-4" />;
      case 'camera_screen':
        return <MonitorPlay className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'camera':
        return 'كاميرا';
      case 'screen':
        return 'شاشة';
      case 'camera_screen':
        return 'شاشة + كاميرا';
      default:
        return 'فيديو';
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || video.recording_type === filter;
    return matchesSearch && matchesFilter;
  });

  if (showRecorder) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowRecorder(false)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
          <span>العودة للمكتبة</span>
        </button>
        <VideoRecorder
          onRecordingComplete={handleRecordingComplete}
          onClose={() => setShowRecorder(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!selectionMode && (
        <BulkActionBar
          selectedCount={selectedVideoIds.size}
          totalCount={filteredVideos.length}
          onSelectAll={selectAllVideos}
          onSelectNone={clearVideoSelection}
          onDelete={bulkDeleteVideos}
          isDeleting={isBulkDeleting}
          itemName="videos"
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في الفيديوهات..."
            className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">الكل</option>
            <option value="camera">كاميرا</option>
            <option value="screen">شاشة</option>
            <option value="camera_screen">شاشة + كاميرا</option>
          </select>

          <button
            onClick={() => setShowRecorder(true)}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">تسجيل جديد</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">
            {searchQuery ? 'لم يتم العثور على نتائج' : 'لا توجد فيديوهات مسجلة'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowRecorder(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              سجل أول فيديو
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            selectionMode ? (
              <div
                key={video.id}
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden cursor-pointer hover:border-blue-500"
                onClick={() => onSelect?.(video)}
              >
                <div className="aspect-video bg-slate-900 relative">
                  {video.thumbnail_path ? (
                    <img
                      src={video.thumbnail_path}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-slate-700" />
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration_seconds)}
                  </div>

                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-xs flex items-center gap-1">
                    {getTypeIcon(video.recording_type)}
                    {getTypeName(video.recording_type)}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-white truncate">{video.title}</h4>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(video.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            ) : (
              <SelectableCard
                key={video.id}
                isSelected={selectedVideoIds.has(video.id)}
                onToggleSelect={() => toggleVideoSelection(video.id)}
                disabled={isBulkDeleting}
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
              >
                <div className="aspect-video bg-slate-900 relative">
                  {video.thumbnail_path ? (
                    <img
                      src={video.thumbnail_path}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-slate-700" />
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration_seconds)}
                  </div>

                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-xs flex items-center gap-1">
                    {getTypeIcon(video.recording_type)}
                    {getTypeName(video.recording_type)}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-white truncate">{video.title}</h4>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(video.created_at).toLocaleDateString('ar-SA')}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(video.storage_path);
                      }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="نسخ الرابط"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(video.storage_path, '_blank');
                      }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="فتح في نافذة جديدة"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <div className="flex-1" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVideo(video.id);
                      }}
                      disabled={deletingId === video.id || isBulkDeleting}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="حذف"
                    >
                      {deletingId === video.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </SelectableCard>
            )
          ))}
        </div>
      )}
    </div>
  );
}
