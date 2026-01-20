import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Monitor,
  MonitorPlay,
  Circle,
  Square,
  Pause,
  Play,
  Download,
  RotateCcw,
  X,
  Loader2,
  Check,
  Settings,
  Mic,
  MicOff,
} from 'lucide-react';

type RecordingMode = 'camera' | 'screen' | 'camera_screen';
type RecordingState = 'idle' | 'preparing' | 'recording' | 'paused' | 'stopped';

interface VideoRecorderProps {
  onRecordingComplete?: (blob: Blob, mode: RecordingMode, durationSeconds: number) => void;
  onClose?: () => void;
  showLibrarySave?: boolean;
}

export function VideoRecorder({ onRecordingComplete, onClose, showLibrarySave = true }: VideoRecorderProps) {
  const [mode, setMode] = useState<RecordingMode | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const stopAllStreams = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (selectedMode: RecordingMode) => {
    setError(null);
    setState('preparing');
    setMode(selectedMode);
    chunksRef.current = [];

    try {
      let stream: MediaStream;

      if (selectedMode === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: audioEnabled,
        });
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          await videoPreviewRef.current.play();
        }
      } else if (selectedMode === 'screen') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });

        if (audioEnabled) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = audioStream.getAudioTracks()[0];
            screenStream.addTrack(audioTrack);
          } catch {
            console.log('Could not add microphone audio');
          }
        }

        stream = screenStream;
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          await videoPreviewRef.current.play();
        }
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: false,
        });

        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: audioEnabled,
        });

        streamRef.current = screenStream;
        cameraStreamRef.current = cameraStream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = screenStream;
          await videoPreviewRef.current.play();
        }

        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = cameraStream;
          await cameraPreviewRef.current.play();
        }

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        canvas.width = 1920;
        canvas.height = 1080;

        const drawComposite = () => {
          if (!isRecordingRef.current) return;

          ctx.drawImage(videoPreviewRef.current!, 0, 0, canvas.width, canvas.height);

          const camWidth = 320;
          const camHeight = 240;
          const padding = 20;

          ctx.save();
          ctx.beginPath();
          ctx.arc(
            canvas.width - padding - camWidth / 2,
            canvas.height - padding - camHeight / 2,
            Math.min(camWidth, camHeight) / 2,
            0,
            Math.PI * 2
          );
          ctx.clip();
          ctx.drawImage(
            cameraPreviewRef.current!,
            canvas.width - padding - camWidth,
            canvas.height - padding - camHeight,
            camWidth,
            camHeight
          );
          ctx.restore();

          animationFrameRef.current = requestAnimationFrame(drawComposite);
        };

        drawComposite();

        const canvasStream = canvas.captureStream(30);

        if (audioEnabled && cameraStream.getAudioTracks().length > 0) {
          canvasStream.addTrack(cameraStream.getAudioTracks()[0]);
        }

        stream = canvasStream;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setState('stopped');
        stopAllStreams();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);

      isRecordingRef.current = true;
      setState('recording');
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording error:', err);
      setError('فشل في بدء التسجيل. تأكد من إعطاء الصلاحيات المطلوبة.');
      setState('idle');
      setMode(null);
      stopAllStreams();
    }
  }, [audioEnabled, stopAllStreams]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [state]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
  }, [state]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const resetRecording = useCallback(() => {
    isRecordingRef.current = false;
    setRecordedBlob(null);
    setState('idle');
    setMode(null);
    setDuration(0);
    setError(null);
    stopAllStreams();
  }, [stopAllStreams]);

  const handleSave = useCallback(() => {
    if (recordedBlob && mode && onRecordingComplete) {
      onRecordingComplete(recordedBlob, mode, duration);
    }
  }, [recordedBlob, mode, duration, onRecordingComplete]);

  const handleDownload = useCallback(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [recordedBlob]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">تسجيل فيديو</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4">
        {state === 'idle' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-center mb-6">اختر نوع التسجيل</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => startRecording('camera')}
                className="flex flex-col items-center gap-3 p-6 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Camera className="w-7 h-7 text-blue-400" />
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">الكاميرا</div>
                  <div className="text-xs text-slate-400">تسجيل من الكاميرا فقط</div>
                </div>
              </button>

              <button
                onClick={() => startRecording('screen')}
                className="flex flex-col items-center gap-3 p-6 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <Monitor className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">الشاشة</div>
                  <div className="text-xs text-slate-400">تسجيل الشاشة فقط</div>
                </div>
              </button>

              <button
                onClick={() => startRecording('camera_screen')}
                className="flex flex-col items-center gap-3 p-6 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                  <MonitorPlay className="w-7 h-7 text-amber-400" />
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">الشاشة + الكاميرا</div>
                  <div className="text-xs text-slate-400">مثل Loom</div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  audioEnabled
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span className="text-sm">{audioEnabled ? 'الصوت مفعل' : 'الصوت معطل'}</span>
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {state === 'preparing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
            <p className="text-slate-300">جاري التحضير...</p>
          </div>
        )}

        {(state === 'recording' || state === 'paused') && (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video
                ref={videoPreviewRef}
                className="w-full h-full object-contain"
                muted
                playsInline
              />

              {mode === 'camera_screen' && (
                <video
                  ref={cameraPreviewRef}
                  className="absolute bottom-4 right-4 w-32 h-24 rounded-full object-cover border-2 border-white shadow-lg"
                  muted
                  playsInline
                />
              )}

              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute top-4 left-4">
                <div className={`recording-indicator ${state === 'paused' ? 'opacity-50' : ''}`}>
                  <span className="text-sm font-medium">
                    {state === 'paused' ? 'متوقف مؤقتاً' : 'جاري التسجيل'}
                  </span>
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full">
                <span className="text-white font-mono text-sm">{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              {state === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                  title="إيقاف مؤقت"
                >
                  <Pause className="w-6 h-6 text-white" />
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                  title="استئناف"
                >
                  <Play className="w-6 h-6 text-white" />
                </button>
              )}

              <button
                onClick={stopRecording}
                className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                title="إيقاف التسجيل"
              >
                <Square className="w-6 h-6 text-white fill-current" />
              </button>
            </div>
          </div>
        )}

        {state === 'stopped' && recordedBlob && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <video
                src={URL.createObjectURL(recordedBlob)}
                controls
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-slate-400 text-sm">
                المدة: {formatDuration(duration)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة التسجيل</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل</span>
                </button>

                {showLibrarySave && (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
