import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronRight, Video } from 'lucide-react';
import type { VideoBlockContent } from '../../types/database';

interface VideoBlockProps {
  content: VideoBlockContent;
  onComplete: () => void;
  isCompleted: boolean;
}

export function VideoBlock({ content, onComplete, isCompleted }: VideoBlockProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasWatchedEnough, setHasWatchedEnough] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const isYouTube = content.url.includes('youtube.com') || content.url.includes('youtu.be');
  const isVimeo = content.url.includes('vimeo.com');

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const getVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      const handleTimeUpdate = () => {
        const percent = (video.currentTime / video.duration) * 100;
        setProgress(percent);
        if (percent >= 80) {
          setHasWatchedEnough(true);
        }
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
        setHasWatchedEnough(true);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

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
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex-1 flex flex-col">
        <div className="relative flex-1 bg-black flex items-center justify-center">
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
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              src={content.url}
              playsInline
            />
          )}

          {!isYouTube && !isVimeo && !isPlaying && (
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
                className="h-full bg-blue-500 rounded-full transition-all"
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{content.title}</h2>
          </div>

          {content.transcript && (
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-sm text-blue-400 hover:text-blue-300 mt-2"
            >
              {showTranscript ? 'Hide transcript' : 'Show transcript'}
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
          <button
            onClick={onComplete}
            disabled={!hasWatchedEnough && !isCompleted}
            className={`
              w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
              ${hasWatchedEnough || isCompleted
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {isCompleted ? 'Continue' : hasWatchedEnough ? 'Mark as Complete' : 'Watch video to continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
