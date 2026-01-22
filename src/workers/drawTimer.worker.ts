// Web Worker that sends draw messages at 30fps
// Workers aren't throttled in background tabs, so drawing continues
// even when the user switches to the screen they're recording

let intervalId: number | null = null;

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'start') {
    const fps = e.data.fps || 30;
    const interval = Math.floor(1000 / fps);
    
    // Clear any existing interval
    if (intervalId !== null) {
      self.clearInterval(intervalId);
    }
    
    // Start sending draw messages at the specified fps
    intervalId = self.setInterval(() => {
      self.postMessage({ type: 'draw' });
    }, interval);
    
    self.postMessage({ type: 'started', fps, interval });
  } else if (e.data.type === 'stop') {
    if (intervalId !== null) {
      self.clearInterval(intervalId);
      intervalId = null;
    }
    self.postMessage({ type: 'stopped' });
  }
};
