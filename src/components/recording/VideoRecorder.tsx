import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Monitor,
  MonitorPlay,
  Square,
  Pause,
  Play,
  Download,
  RotateCcw,
  X,
  Loader2,
  Check,
  Mic,
  MicOff,
  AlertCircle,
} from 'lucide-react';

type RecordingMode = 'camera' | 'screen' | 'camera_screen';
type RecordingState = 'idle' | 'preparing' | 'recording' | 'paused' | 'stopped';

interface VideoRecorderProps {
  onRecordingComplete?: (blob: Blob, mode: RecordingMode, durationSeconds: number) => void | Promise<void>;
  onClose?: () => void;
  showLibrarySave?: boolean;
}

// Helper function to get the best supported MIME type
function getSupportedMimeType(): string {
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  
  return ''; // Let the browser decide
}

// Helper function to get user-friendly error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const errorName = error.name;
    
    switch (errorName) {
      case 'NotAllowedError':
        return 'تم رفض إذن الوصول للكاميرا أو الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح ثم المحاولة مرة أخرى.';
      case 'NotFoundError':
        return 'لم يتم العثور على كاميرا أو ميكروفون. تأكد من توصيل الجهاز بشكل صحيح.';
      case 'NotSupportedError':
        return 'المتصفح لا يدعم تسجيل الفيديو. جرب استخدام متصفح Chrome أو Firefox.';
      case 'NotReadableError':
        return 'الكاميرا أو الميكروفون قيد الاستخدام من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.';
      case 'OverconstrainedError':
        return 'الكاميرا لا تدعم الإعدادات المطلوبة. سيتم استخدام الإعدادات الافتراضية.';
      case 'AbortError':
        return 'تم إلغاء التسجيل. يرجى المحاولة مرة أخرى.';
      case 'SecurityError':
        return 'خطأ أمني. تأكد من أنك تستخدم اتصال HTTPS آمن.';
      default:
        if (error.message.includes('Permission denied')) {
          return 'تم رفض إذن الوصول. يرجى السماح بالوصول من إعدادات المتصفح.';
        }
        return `فشل في بدء التسجيل: ${error.message}`;
    }
  }
  
  return 'فشل في بدء التسجيل. تأكد من إعطاء الصلاحيات المطلوبة.';
}

export function VideoRecorder({ onRecordingComplete, onClose, showLibrarySave = true }: VideoRecorderProps) {
  const [mode, setMode] = useState<RecordingMode | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasTrackRef = useRef<MediaStreamTrack | null>(null);
  const frameCountRef = useRef<number>(0);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const drawWorkerRef = useRef<Worker | null>(null);

  // Create blob URL once when recordedBlob changes, and revoke on cleanup
  useEffect(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
      };
    }
    return undefined;
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      // Stop draw worker if active
      if (drawWorkerRef.current) {
        drawWorkerRef.current.postMessage({ type: 'stop' });
        drawWorkerRef.current.terminate();
        drawWorkerRef.current = null;
      }
      // Cancel video frame callback if active
      if (videoFrameCallbackRef.current !== null && videoPreviewRef.current) {
        if ('cancelVideoFrameCallback' in videoPreviewRef.current) {
          (videoPreviewRef.current as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
        }
        videoFrameCallbackRef.current = null;
      }
    };
  }, []);

  const stopAllStreams = useCallback(() => {
    // Stop draw worker if active
    if (drawWorkerRef.current) {
      drawWorkerRef.current.postMessage({ type: 'stop' });
      drawWorkerRef.current.terminate();
      drawWorkerRef.current = null;
    }
    // Cancel animation frame to stop drawing loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Cancel video frame callback if active
    if (videoFrameCallbackRef.current !== null && videoPreviewRef.current) {
      if ('cancelVideoFrameCallback' in videoPreviewRef.current) {
        (videoPreviewRef.current as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
      videoFrameCallbackRef.current = null;
    }
    // Stop all stream tracks
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
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupportedError');
      }

      // Check MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('NotSupportedError');
      }

      // Check canvas.captureStream support for camera_screen mode
      if (selectedMode === 'camera_screen' && !HTMLCanvasElement.prototype.captureStream) {
        throw new Error('NotSupportedError');
      }

      let stream: MediaStream;

      if (selectedMode === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: audioEnabled,
        });
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          try {
            await videoPreviewRef.current.play();
          } catch (playError) {
            console.warn('Video autoplay failed:', playError);
            // Continue - video will still work when user interacts
          }
        }
      } else if (selectedMode === 'screen') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });

        // Handle user stopping screen share via browser UI
        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.addEventListener('ended', () => {
            console.log('Screen share ended by user');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
              if (timerRef.current) clearInterval(timerRef.current);
            }
          });
        }

        if (audioEnabled) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = audioStream.getAudioTracks()[0];
            if (audioTrack) {
              screenStream.addTrack(audioTrack);
            }
          } catch {
            console.log('Could not add microphone audio');
          }
        }

        stream = screenStream;
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          try {
            await videoPreviewRef.current.play();
          } catch (playError) {
            console.warn('Video autoplay failed:', playError);
            // Continue - video will still work when user interacts
          }
        }
      } else {
        // Camera + Screen mode
        // IMPORTANT: Get camera FIRST, setup canvas, THEN get screen share
        // This ensures recording starts immediately after user selects screen,
        // rather than having delays that cause missed content
        
        // Step 1: Get camera stream FIRST (before screen share picker opens)
        console.log('Getting camera stream first...');
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          audio: audioEnabled,
        });
        cameraStreamRef.current = cameraStream;
        console.log('Camera stream ready');

        // Step 2: Setup canvas BEFORE screen share picker
        // Wait for the next frame to ensure canvas is mounted
        await new Promise(resolve => requestAnimationFrame(resolve));

        const canvas = canvasRef.current;
        if (!canvas) {
          cameraStream.getTracks().forEach(track => track.stop());
          throw new Error('Canvas element not available');
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          cameraStream.getTracks().forEach(track => track.stop());
          throw new Error('Canvas 2D context not available');
        }
        canvasContextRef.current = ctx;
        canvas.width = 1920;
        canvas.height = 1080;

        // Setup camera preview before screen share
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = cameraStream;
          try {
            await cameraPreviewRef.current.play();
          } catch (playError) {
            console.warn('Camera video autoplay failed:', playError);
          }
        }

        // Step 3: NOW request screen share - user selects screen here
        // After this returns, we start recording IMMEDIATELY
        console.log('Requesting screen share...');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        console.log('Screen stream obtained, starting recording immediately!');

        // Handle user stopping screen share via browser UI
        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.addEventListener('ended', () => {
            console.log('Screen share ended by user (camera_screen mode)');
            isRecordingRef.current = false;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
              if (timerRef.current) clearInterval(timerRef.current);
            }
          });
        }

        streamRef.current = screenStream;

        // Step 4: Attach screen to preview (fast operation)
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = screenStream;
          // Don't await play - let it happen async to not delay recording
          videoPreviewRef.current.play().catch(err => {
            console.warn('Screen video autoplay failed:', err);
          });
        }

        // Ensure video elements are mounted
        if (!videoPreviewRef.current || !cameraPreviewRef.current) {
          throw new Error('عناصر الفيديو غير متاحة. يرجى المحاولة مرة أخرى.');
        }

        // Step 5: Define the composite drawing function
        let drawCount = 0;
        let skipCount = 0;
        
        const drawComposite = () => {
          if (!isRecordingRef.current) return;
          
          // Increment frame counter for debugging
          frameCountRef.current++;
          
          const currentCtx = canvasContextRef.current;
          const currentCanvas = canvasRef.current;
          const videoPreview = videoPreviewRef.current;
          const cameraPreview = cameraPreviewRef.current;
          
          if (!currentCtx || !currentCanvas || !videoPreview || !cameraPreview) {
            skipCount++;
            // Worker will call again on next tick - no need to register callback
            return;
          }

          // Only draw if video has actual frame data
          if (videoPreview.readyState < 2 || cameraPreview.readyState < 2) {
            skipCount++;
            // Log readyState issues periodically
            if (skipCount % 30 === 0) {
              console.log(`Skipping draw - readyState: screen=${videoPreview.readyState}, camera=${cameraPreview.readyState}`);
            }
            // Worker will call again on next tick - no need to register callback
            return;
          }

          // Actually drawing!
          drawCount++;
          
          // Log video element status periodically to verify they're playing
          if (drawCount === 1 || drawCount % 60 === 0) {
            console.log(`Video states - Screen: playing=${!videoPreview.paused}, time=${videoPreview.currentTime.toFixed(2)}s, dims=${videoPreview.videoWidth}x${videoPreview.videoHeight}, Camera: playing=${!cameraPreview.paused}, time=${cameraPreview.currentTime.toFixed(2)}s, dims=${cameraPreview.videoWidth}x${cameraPreview.videoHeight}`);
          }
          
          // Draw screen directly to canvas
          currentCtx.drawImage(videoPreview, 0, 0, currentCanvas.width, currentCanvas.height);

          const camWidth = 320;
          const camHeight = 240;
          const padding = 20;

          // Draw camera overlay in a circular clip
          currentCtx.save();
          currentCtx.beginPath();
          currentCtx.arc(
            currentCanvas.width - padding - camWidth / 2,
            currentCanvas.height - padding - camHeight / 2,
            Math.min(camWidth, camHeight) / 2,
            0,
            Math.PI * 2
          );
          currentCtx.clip();
          currentCtx.drawImage(
            cameraPreview,
            currentCanvas.width - padding - camWidth,
            currentCanvas.height - padding - camHeight,
            camWidth,
            camHeight
          );
          currentCtx.restore();

          // Sample canvas pixels from CENTER to verify content is changing
          if (drawCount % 30 === 0) {
            const imageData = currentCtx.getImageData(960, 540, 1, 1);
            const pixel = imageData.data;
            console.log(`Canvas pixel sample at draw ${drawCount}: RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
          }

          // Log actual draws periodically
          if (drawCount % 60 === 0) {
            console.log(`Actually drew ${drawCount} frames (skipped ${skipCount}), loop iterations: ${frameCountRef.current}`);
          }

          // Note: Worker handles timing - no need to register for next frame here
        };

        // Step 6: Wait for video streams to have actual frames before capturing
        // This ensures the canvas has content when we start capturing
        const waitForFirstFrame = (): Promise<void> => {
          return new Promise((resolve) => {
            const checkReady = () => {
              const screenReady = videoPreviewRef.current?.readyState >= 2;
              const cameraReady = cameraPreviewRef.current?.readyState >= 2;
              if (screenReady && cameraReady) {
                console.log('Video streams ready, starting capture');
                resolve();
              } else {
                requestAnimationFrame(checkReady);
              }
            };
            checkReady();
          });
        };

        await waitForFirstFrame();

        // NOW start the draw loop and capture - videos are ready!
        isRecordingRef.current = true;
        
        // Draw first frame manually to ensure canvas has content
        const videoPreview = videoPreviewRef.current!;
        const cameraPreview = cameraPreviewRef.current!;
        
        // Draw screen
        ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
        
        // Draw camera overlay
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
          cameraPreview,
          canvas.width - padding - camWidth,
          canvas.height - padding - camHeight,
          camWidth,
          camHeight
        );
        ctx.restore();
        
        console.log('First frame drawn manually');

        // Reset frame counter
        frameCountRef.current = 0;

        // Capture the canvas stream with automatic 30fps capture
        // Browser handles capture timing automatically
        const canvasStream = canvas.captureStream(30);
        console.log('Canvas stream capture started (automatic 30fps mode)');
        
        // Create Web Worker for background-safe drawing timer
        // Workers aren't throttled when tab is in background (e.g., when user switches to recorded screen)
        const worker = new Worker(
          new URL('../../workers/drawTimer.worker.ts', import.meta.url),
          { type: 'module' }
        );
        drawWorkerRef.current = worker;
        
        worker.onmessage = (e) => {
          if (e.data.type === 'draw') {
            drawComposite();
          } else if (e.data.type === 'started') {
            console.log(`Draw worker started at ${e.data.fps}fps (${e.data.interval}ms interval)`);
          } else if (e.data.type === 'stopped') {
            console.log('Draw worker stopped');
          }
        };
        
        worker.onerror = (error) => {
          console.error('Draw worker error:', error);
        };
        
        // Start the worker timer at 30fps
        worker.postMessage({ type: 'start', fps: 30 });
        console.log('Using Web Worker for background-safe drawing');

        const audioTracks = cameraStream.getAudioTracks();
        if (audioEnabled && audioTracks.length > 0) {
          canvasStream.addTrack(audioTracks[0]);
        }

        stream = canvasStream;
      }

      // Get best supported MIME type
      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      const recorder = new MediaRecorder(stream, recorderOptions);

      let dataEventCount = 0;
      recorder.ondataavailable = (e) => {
        dataEventCount++;
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log(`MediaRecorder data chunk ${dataEventCount}: ${e.data.size} bytes`);
        } else {
          console.warn(`MediaRecorder data chunk ${dataEventCount}: EMPTY (0 bytes)`);
        }
      };

      recorder.onstop = () => {
        const recordedMimeType = mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: recordedMimeType });
        
        console.log('Recording stopped. Blob size:', blob.size, 'Chunks:', chunksRef.current.length);
        
        // Check if recording produced any data
        if (blob.size === 0) {
          console.error('Empty recording - no data captured');
          setError('فشل في تسجيل الفيديو. لم يتم التقاط أي بيانات. يرجى المحاولة مرة أخرى.');
          setState('idle');
          setMode(null);
          stopAllStreams();
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          if (videoFrameCallbackRef.current !== null && videoPreviewRef.current && 'cancelVideoFrameCallback' in videoPreviewRef.current) {
            (videoPreviewRef.current as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
            videoFrameCallbackRef.current = null;
          }
          return;
        }
        
        setRecordedBlob(blob);
        setState('stopped');
        stopAllStreams();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (videoFrameCallbackRef.current !== null && videoPreviewRef.current && 'cancelVideoFrameCallback' in videoPreviewRef.current) {
          (videoPreviewRef.current as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
          videoFrameCallbackRef.current = null;
        }
      };

      // Handle MediaRecorder errors during recording
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.');
        isRecordingRef.current = false;
        setState('idle');
        setMode(null);
        stopAllStreams();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (videoFrameCallbackRef.current !== null && videoPreviewRef.current && 'cancelVideoFrameCallback' in videoPreviewRef.current) {
          (videoPreviewRef.current as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
          videoFrameCallbackRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);

      if (selectedMode !== 'camera_screen') {
        isRecordingRef.current = true;
      }
      setState('recording');
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording error:', err);
      setError(getErrorMessage(err));
      setState('idle');
      setMode(null);
      // Clean up timer if it was started
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
    setPreviewUrl(null);
    setState('idle');
    setMode(null);
    setDuration(0);
    setError(null);
    setIsSaving(false);
    stopAllStreams();
  }, [stopAllStreams]);

  const handleSave = useCallback(async () => {
    if (recordedBlob && mode && onRecordingComplete) {
      setIsSaving(true);
      try {
        await onRecordingComplete(recordedBlob, mode, duration);
      } catch (err) {
        console.error('Save error:', err);
        setError('فشل في حفظ الفيديو. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsSaving(false);
      }
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
      {/* Offscreen canvas - must be rendered (not display:none) for captureStream() to work */}
      <canvas ref={canvasRef} className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true" />
      
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
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-right">
                    <p>{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                    >
                      إخفاء الرسالة
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(state === 'preparing' || state === 'recording' || state === 'paused') && (
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

              {/* Only show recording indicator when actually recording/paused */}
              {(state === 'recording' || state === 'paused') && (
                <>
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
                </>
              )}

              {/* Show preparing indicator */}
              {state === 'preparing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <span className="text-white text-sm">جاري التحضير...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Only show controls when recording/paused */}
            {(state === 'recording' || state === 'paused') && (
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
            )}
          </div>
        )}

        {state === 'stopped' && recordedBlob && previewUrl && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>

            {/* Duration display */}
            <div className="text-slate-400 text-sm text-center">
              المدة: {formatDuration(duration)}
            </div>

            {/* Action buttons - always stacked for better fit in narrow containers */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={resetRecording}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RotateCcw className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">إعادة</span>
                </button>

                <button
                  onClick={handleDownload}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">تنزيل</span>
                </button>
              </div>

              {showLibrarySave && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 flex-shrink-0" />
                      <span>حفظ في المكتبة</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
