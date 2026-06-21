import { useState, useEffect } from 'react';

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  // Ensure we capture the keys only once to prevent infinite loops if durations is passed inline
  const [sceneKeys] = useState(() => Object.keys(durations));

  useEffect(() => {
    // Wait a brief moment for the DOM to settle before starting recording
    const startTimeout = setTimeout(() => {
      window.startRecording?.();
    }, 100);

    let isCancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    function nextScene(index: number) {
      if (isCancelled) return;
      if (index >= sceneKeys.length) {
        window.stopRecording?.();
        // Loop back to the start
        setCurrentSceneIndex(0);
        timeout = setTimeout(() => nextScene(1), durations[sceneKeys[0]]);
        return;
      }
      setCurrentSceneIndex(index);
      timeout = setTimeout(() => nextScene(index + 1), durations[sceneKeys[index]]);
    }

    // Start the first scene's timer
    timeout = setTimeout(() => nextScene(1), durations[sceneKeys[0]]);

    return () => {
      isCancelled = true;
      clearTimeout(startTimeout);
      clearTimeout(timeout);
    };
  }, [sceneKeys, durations]);

  return { currentScene: currentSceneIndex };
}
