import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronRight, Video, SkipForward, Loader2 } from 'lucide-react';
import { useTranslation } from '../../contexts';
import type { VideoBlockContent } from '../../types/database';

interface VideoBlockProps {
  content: VideoBlockContent;
  onComplete: () => void;
  isCompleted: boolean;
}

export function VideoBlock({ content, onComplete, isCompleted }: VideoBlockProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasWatchedEnough, setHasWatchedEnough] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showSkipOption, setShowSkipOption] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const watchTimeRef = useRef<number>(0);

  const isYouTube = content.url.includes('youtube.com') || content.url.includes('youtu.be');
  const isVimeo = content.url.includes('vimeo.com');

  const getVideoMimeType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'ogv': 'video/ogg',
      'mov': 'video/quicktime',
      'm4v': 'video/mp4',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
    };
    return mimeTypes[extension || ''] || 'video/mp4';
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const getVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  // Handle skip video action
  const handleSkipVideo = useCallback(() => {
    setHasWatchedEnough(true);
  }, []);

  // Set up loading timeout - show skip option if video doesn't load in 10 seconds
  useEffect(() => {
    if (!isYouTube && !isVimeo && !videoReady && !videoError) {
      timeoutRef.current = window.setTimeout(() => {
        setLoadingTimeout(true);
        setShowSkipOption(true);
      }, 10000); // 10 seconds timeout

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [isYouTube, isVimeo, videoReady, videoError]);

  // Main video event listener setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded, duration:', video.duration);
      setVideoReady(true);
      setLoadingTimeout(false);
      // Clear the loading timeout since video loaded successfully
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handleCanPlay = () => {
      console.log('Video can play');
      setVideoReady(true);
      setLoadingTimeout(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handleTimeUpdate = () => {
      // Guard against NaN from division by zero
      if (!video.duration || !isFinite(video.duration)) return;
      
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(isFinite(percent) ? percent : 0);
      
      // Track actual watch time
      watchTimeRef.current = video.currentTime;
      
      // Enable completion at 80% progress
      if (percent >= 80) {
        setHasWatchedEnough(true);
      }
      
      // Show skip option after 30 seconds of watching
      if (video.currentTime >= 30 && !showSkipOption) {
        setShowSkipOption(true);
      }
    };

    const handlePlay = () => {
      console.log('Video playing');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('Video paused');
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      console.log('Video ended');
      setIsPlaying(false);
      setHasWatchedEnough(true);
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      console.error('Video loading error:', target.error?.message || 'Unknown error');
      setVideoError(true);
      setShowSkipOption(true);
    };

    const handleStalled = () => {
      console.log('Video stalled');
      // Show skip option if video stalls
      setTimeout(() => {
        if (!videoReady) {
          setShowSkipOption(true);
        }
      }, 5000);
    };

    const handleWaiting = () => {
      console.log('Video waiting/buffering');
    };

    // Attach all event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('waiting', handleWaiting);

    // Check if video is already loaded (e.g., from cache)
    if (video.readyState >= 2) {
      console.log('Video already loaded from cache');
      setVideoReady(true);
      setLoadingTimeout(false);
    }

    // Try to load the video
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [content.url, showSkipOption, videoReady]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      videoRef.current.currentTime = (percent / 100) * videoRef.current.duration;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {isYouTube ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${getYouTubeId(content.url)}?rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setHasWatchedEnough(true)}
            />
          ) : isVimeo ? (
            <iframe
              className="w-full h-full"
              src={`https://player.vimeo.com/video/${getVimeoId(content.url)}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => setHasWatchedEnough(true)}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
              >
                <source src={content.url} type={getVideoMimeType(content.url)} />
                {t('blocks.video.noSupport')}
              </video>
              
              {/* Loading indicator */}
              {!videoReady && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <div className="text-center px-6">
                    <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-300 text-sm">
                      {loadingTimeout ? t('blocks.video.slowLoading') : t('blocks.video.loading')}
                    </p>
                    {loadingTimeout && (
                      <button
                        onClick={handleSkipVideo}
                        className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 mx-auto"
                      >
                        <SkipForward className="w-4 h-4" />
                        {t('blocks.video.skipVideo')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Error state */}
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
                      <Video className="w-8 h-8 text-error" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{t('blocks.video.unavailable')}</h3>
                    <p className="text-slate-300 text-sm mb-4">
                      {t('blocks.video.unavailableDesc')}
                    </p>
                    <button
                      onClick={handleSkipVideo}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      {t('blocks.video.continueAnyway')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Play button overlay - only show when video is ready and not playing */}
          {!isYouTube && !isVimeo && !isPlaying && videoReady && !videoError && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                <Play className="w-10 h-10 text-slate-900 ml-1" />
              </div>
            </button>
          )}
        </div>

        {!isYouTube && !isVimeo && (
          <div className="bg-slate-800 px-4 py-3">
            <div
              ref={progressRef}
              className="h-1.5 bg-slate-600 rounded-full cursor-pointer mb-3"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

                <span className="text-sm text-slate-300">
                  {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'} / {' '}
                  {content.duration ? formatTime(content.duration) : videoRef.current ? formatTime(videoRef.current.duration || 0) : '0:00'}
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800 border-t border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{content.title}</h2>
          </div>

          {content.transcript && (
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-sm text-primary-400 hover:text-primary-300 mt-2"
            >
              {showTranscript ? t('blocks.video.hideTranscript') : t('blocks.video.showTranscript')}
            </button>
          )}

          {showTranscript && content.transcript && (
            <div className="mt-4 p-4 bg-slate-900 rounded-lg max-h-48 overflow-y-auto">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {content.transcript}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700">
          {/* Skip video option - shown after 30s of watching or if there's a loading issue */}
          {showSkipOption && !hasWatchedEnough && !isCompleted && (
            <button
              onClick={handleSkipVideo}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-3 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
            >
              <SkipForward className="w-4 h-4" />
              {t('blocks.video.skipVideo')}
            </button>
          )}
          
          <button
            onClick={onComplete}
            disabled={!hasWatchedEnough && !isCompleted}
            className={`
              w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
              ${hasWatchedEnough || isCompleted
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {isCompleted 
              ? t('blocks.continue') 
              : hasWatchedEnough 
                ? t('blocks.markComplete') 
                : videoReady 
                  ? t('blocks.video.watchToComplete')
                  : t('blocks.video.loading')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
