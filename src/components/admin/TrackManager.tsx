import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  ChevronRight,
  Loader2,
  Search,
  Image,
  X,
} from 'lucide-react';
import type { Track, Module } from '../../types/database';
import { BulkActionBar } from './BulkActionBar';
import { SelectableCard } from './SelectableCard';

interface TrackManagerProps {
  onEditJourney: (moduleId: string, journeyVersionId?: string) => void;
}

interface TrackWithModules extends Track {
  modules: (Module & { journey_versions?: { id: string; status: string }[] })[];
}

const SAMPLE_COVER_IMAGES = [
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=800',
];

export function TrackManager({ onEditJourney }: TrackManagerProps) {
  const { showToast } = useToast();
  const [tracks, setTracks] = useState<TrackWithModules[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTrack, setShowCreateTrack] = useState(false);
  const [showCreateModule, setShowCreateModule] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('tracks')
      .select(`
        *,
        modules (
          *,
          journey_versions (id, status, version)
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setTracks(data as TrackWithModules[]);
    }
    setIsLoading(false);
  };

  const createTrack = async (data: { title: string; description: string; level: string; cover_image_url?: string }) => {
    setIsCreatingTrack(true);
    try {
      const { error } = await supabase.from('tracks').insert({
        title: data.title,
        description: data.description,
        level: data.level,
        cover_image_url: data.cover_image_url || null,
        tags: JSON.stringify([]),
      });

      if (error) throw error;

      showToast('success', 'Track created successfully');
      await loadTracks();
      setShowCreateTrack(false);
    } catch (error) {
      console.error('Error creating track:', error);
      showToast('error', 'Failed to create track. Please try again.');
    } finally {
      setIsCreatingTrack(false);
    }
  };

  const createModule = async (trackId: string, data: { title: string; description: string }) => {
    setIsCreatingModule(true);
    try {
      const track = tracks.find(t => t.id === trackId);
      const orderIndex = track?.modules?.length || 0;

      const { data: module, error } = await supabase
        .from('modules')
        .insert({
          track_id: trackId,
          title: data.title,
          description: data.description,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      if (!module) throw new Error('Module creation failed');

      const { data: journeyVersion, error: journeyError } = await supabase
        .from('journey_versions')
        .insert({
          module_id: module.id,
          version: 1,
          status: 'draft',
          graph_json: { startBlockId: '', blocks: [], edges: [] },
        })
        .select()
        .single();

      if (journeyError) {
        console.error('Error creating journey version:', journeyError);
        // Module was created, but journey version failed - still show partial success
        showToast('warning', 'Module created but journey setup failed. Please try editing the module.');
      } else {
        showToast('success', 'Module created successfully');
      }

      await loadTracks();
      setShowCreateModule(null);

      if (journeyVersion) {
        onEditJourney(module.id, journeyVersion.id);
      }
    } catch (error) {
      console.error('Error creating module:', error);
      showToast('error', 'Failed to create module. Please try again.');
    } finally {
      setIsCreatingModule(false);
    }
  };

  const deleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track and all its modules?')) return;

    setDeletingTrackId(trackId);
    try {
      const { error } = await supabase.from('tracks').delete().eq('id', trackId);
      
      if (error) throw error;

      showToast('success', 'Track deleted successfully');
      await loadTracks();
    } catch (error) {
      console.error('Error deleting track:', error);
      showToast('error', 'Failed to delete track. Please try again.');
    } finally {
      setDeletingTrackId(null);
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    setDeletingModuleId(moduleId);
    try {
      const { error } = await supabase.from('modules').delete().eq('id', moduleId);
      
      if (error) throw error;

      showToast('success', 'Module deleted successfully');
      await loadTracks();
    } catch (error) {
      console.error('Error deleting module:', error);
      showToast('error', 'Failed to delete module. Please try again.');
    } finally {
      setDeletingModuleId(null);
    }
  };

  const bulkDeleteTracks = async () => {
    const count = selectedTrackIds.size;
    const trackNames = tracks
      .filter(t => selectedTrackIds.has(t.id))
      .slice(0, 5)
      .map(t => t.title)
      .join(', ');
    const message = count <= 5 
      ? `Delete ${count} track${count > 1 ? 's' : ''} (${trackNames})?`
      : `Delete ${count} tracks (${trackNames}, and ${count - 5} more)?`;
    
    if (!confirm(`${message}\n\nThis will also delete all associated modules and content. This action cannot be undone.`)) return;

    setIsBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .in('id', Array.from(selectedTrackIds));
      
      if (error) throw error;

      showToast('success', `Successfully deleted ${count} track${count > 1 ? 's' : ''}`);
      setSelectedTrackIds(new Set());
      await loadTracks();
    } catch (error) {
      console.error('Error bulk deleting tracks:', error);
      showToast('error', 'Failed to delete some tracks. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const bulkDeleteModules = async () => {
    const count = selectedModuleIds.size;
    const moduleNames = tracks
      .flatMap(t => t.modules || [])
      .filter(m => selectedModuleIds.has(m.id))
      .slice(0, 5)
      .map(m => m.title)
      .join(', ');
    const message = count <= 5 
      ? `Delete ${count} module${count > 1 ? 's' : ''} (${moduleNames})?`
      : `Delete ${count} modules (${moduleNames}, and ${count - 5} more)?`;
    
    if (!confirm(`${message}\n\nThis will also delete all associated journeys and content. This action cannot be undone.`)) return;

    setIsBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .in('id', Array.from(selectedModuleIds));
      
      if (error) throw error;

      showToast('success', `Successfully deleted ${count} module${count > 1 ? 's' : ''}`);
      setSelectedModuleIds(new Set());
      await loadTracks();
    } catch (error) {
      console.error('Error bulk deleting modules:', error);
      showToast('error', 'Failed to delete some modules. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleTrackSelection = (trackId: string) => {
    const newSelection = new Set(selectedTrackIds);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    setSelectedTrackIds(newSelection);
  };

  const toggleModuleSelection = (moduleId: string) => {
    const newSelection = new Set(selectedModuleIds);
    if (newSelection.has(moduleId)) {
      newSelection.delete(moduleId);
    } else {
      newSelection.add(moduleId);
    }
    setSelectedModuleIds(newSelection);
  };

  const selectAllTracks = () => {
    setSelectedTrackIds(new Set(filteredTracks.map(t => t.id)));
  };

  const selectAllModules = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const moduleIds = (track.modules || []).map(m => m.id);
    setSelectedModuleIds(new Set([...selectedModuleIds, ...moduleIds]));
  };

  const clearTrackSelection = () => {
    setSelectedTrackIds(new Set());
  };

  const clearModuleSelection = () => {
    setSelectedModuleIds(new Set());
  };

  const filteredTracks = tracks.filter(
    t => t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Track Manager</h1>
          <button
            onClick={() => setShowCreateTrack(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Track
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No tracks yet</h3>
            <p className="text-slate-500 mb-4">Create your first learning track to get started</p>
            <button
              onClick={() => setShowCreateTrack(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Track
            </button>
          </div>
        ) : (
          <>
            <BulkActionBar
              selectedCount={selectedTrackIds.size}
              totalCount={filteredTracks.length}
              onSelectAll={selectAllTracks}
              onSelectNone={clearTrackSelection}
              onDelete={bulkDeleteTracks}
              isDeleting={isBulkDeleting}
              itemName="tracks"
            />
            <div className="p-6 space-y-4">
              {filteredTracks.map((track) => (
                <SelectableCard
                  key={track.id}
                  isSelected={selectedTrackIds.has(track.id)}
                  onToggleSelect={() => toggleTrackSelection(track.id)}
                  disabled={isBulkDeleting}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 pl-8">
                    {track.cover_image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={track.cover_image_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-white">{track.title}</h3>
                      <p className="text-sm text-slate-400">{track.description || 'No description'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          track.level === 'beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                          track.level === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {track.level}
                        </span>
                        <span className="text-xs text-slate-500">
                          {track.modules?.length || 0} modules
                        </span>
                      </div>
                    </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrack(track);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        disabled={deletingTrackId === track.id || isBulkDeleting}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrack(track.id);
                        }}
                        disabled={deletingTrackId === track.id || isBulkDeleting}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingTrackId === track.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-700">
                    {selectedModuleIds.size > 0 && (track.modules || []).some(m => selectedModuleIds.has(m.id)) && (
                      <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                          {(track.modules || []).filter(m => selectedModuleIds.has(m.id)).length} module{(track.modules || []).filter(m => selectedModuleIds.has(m.id)).length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllModules(track.id);
                            }}
                            className="text-xs px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
                          >
                            Select All
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              bulkDeleteModules();
                            }}
                            disabled={isBulkDeleting}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Delete Selected
                          </button>
                        </div>
                      </div>
                    )}
                    {track.modules?.map((module) => {
                    const publishedVersion = module.journey_versions?.find(v => v.status === 'published');
                    const draftVersion = module.journey_versions?.find(v => v.status === 'draft');
                    const latestVersion = publishedVersion || draftVersion;

                    return (
                      <div
                        key={module.id}
                        className={`px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors border-b border-slate-700 last:border-b-0 ${
                          selectedModuleIds.has(module.id) ? 'bg-blue-500/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedModuleIds.has(module.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleModuleSelection(module.id);
                            }}
                            disabled={isBulkDeleting}
                            className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                          />
                          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300">
                            {module.order_index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-200">{module.title}</h4>
                            <div className="flex items-center gap-2 text-xs">
                              {publishedVersion && (
                                <span className="text-emerald-400">Published</span>
                              )}
                              {draftVersion && !publishedVersion && (
                                <span className="text-amber-400">Draft</span>
                              )}
                              {!latestVersion && (
                                <span className="text-slate-500">No content</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditJourney(module.id, latestVersion?.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                          >
                            Edit Journey
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteModule(module.id);
                            }}
                            disabled={deletingModuleId === module.id || isBulkDeleting}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors disabled:opacity-50"
                          >
                            {deletingModuleId === module.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModule(track.id);
                      }}
                      disabled={isBulkDeleting}
                      className="w-full px-4 py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Module
                    </button>
                  </div>
                </SelectableCard>
              ))}
            </div>
          </>
        )}
      </div>

      {showCreateTrack && (
        <CreateTrackModal
          onClose={() => setShowCreateTrack(false)}
          onCreate={createTrack}
          isCreating={isCreatingTrack}
        />
      )}

      {showCreateModule && (
        <CreateModuleModal
          onClose={() => setShowCreateModule(null)}
          onCreate={(data) => createModule(showCreateModule, data)}
          isCreating={isCreatingModule}
        />
      )}

      {editingTrack && (
        <EditTrackModal
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          isSaving={isSavingTrack}
          onSave={async (data) => {
            setIsSavingTrack(true);
            try {
              const { error } = await supabase.from('tracks').update(data).eq('id', editingTrack.id);
              
              if (error) throw error;

              showToast('success', 'Track updated successfully');
              await loadTracks();
              setEditingTrack(null);
            } catch (error) {
              console.error('Error updating track:', error);
              showToast('error', 'Failed to update track. Please try again.');
            } finally {
              setIsSavingTrack(false);
            }
          }}
        />
      )}
    </div>
  );
}

function CreateTrackModal({ onClose, onCreate, isCreating }: {
  onClose: () => void;
  onCreate: (data: { title: string; description: string; level: string; cover_image_url?: string }) => void;
  isCreating?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-lg p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Create New Track</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Image</label>
            <div className="relative">
              {coverImageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setCoverImageUrl('')}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="w-full aspect-video bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-slate-500 transition-colors"
                >
                  <Image className="w-8 h-8 text-slate-500" />
                  <span className="text-sm text-slate-400">Add cover image</span>
                </button>
              )}
            </div>

            {showImagePicker && !coverImageUrl && (
              <div className="mt-3 space-y-3">
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Or choose from gallery:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_COVER_IMAGES.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCoverImageUrl(url);
                          setShowImagePicker(false);
                        }}
                        className="aspect-video rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., GenAI Fundamentals"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will learners gain from this track?"
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ title, description, level, cover_image_url: coverImageUrl || undefined })}
            disabled={!title.trim() || isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create Track'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateModuleModal({ onClose, onCreate, isCreating }: {
  onClose: () => void;
  onCreate: (data: { title: string; description: string }) => void;
  isCreating?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Add New Module</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to AI"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this module cover?"
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ title, description })}
            disabled={!title.trim() || isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTrackModal({ track, onClose, onSave, isSaving }: {
  track: Track;
  onClose: () => void;
  onSave: (data: Partial<Track>) => void;
  isSaving?: boolean;
}) {
  const [title, setTitle] = useState(track.title);
  const [description, setDescription] = useState(track.description || '');
  const [level, setLevel] = useState(track.level);
  const [coverImageUrl, setCoverImageUrl] = useState(track.cover_image_url || '');
  const [showImagePicker, setShowImagePicker] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-lg p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Edit Track</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Image</label>
            <div className="relative">
              {coverImageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setCoverImageUrl('')}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="w-full aspect-video bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-slate-500 transition-colors"
                >
                  <Image className="w-8 h-8 text-slate-500" />
                  <span className="text-sm text-slate-400">Add cover image</span>
                </button>
              )}
            </div>

            {showImagePicker && !coverImageUrl && (
              <div className="mt-3 space-y-3">
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Or choose from gallery:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_COVER_IMAGES.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCoverImageUrl(url);
                          setShowImagePicker(false);
                        }}
                        className="aspect-video rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Track['level'])}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ title, description, level, cover_image_url: coverImageUrl || null })}
            disabled={!title.trim() || isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
