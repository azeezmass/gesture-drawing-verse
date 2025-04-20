
// MediaPipe integration for hand tracking

export type HandLandmark = {
  x: number;
  y: number;
  z: number;
};

export type HandGesture = {
  landmarks: HandLandmark[];
  isDrawing: boolean;
};

export enum GestureType {
  NONE = 'none',
  DRAWING = 'drawing',
  ERASING = 'erasing',
  CLEAR = 'clear',
}

// Previous landmark positions for advanced smoothing
let previousLandmarks: HandLandmark[] = [];
let previousGesture: GestureType = GestureType.NONE;
const smoothingFactor = 0.65; // More smoothing (higher value = more smoothing)
let gestureDebounceTimer: number | null = null;
let gestureDebounceDelay = 150; // ms

// Enhanced smoothing with momentum consideration
const smoothLandmarks = (landmarks: HandLandmark[]): HandLandmark[] => {
  if (previousLandmarks.length === 0 || previousLandmarks.length !== landmarks.length) {
    // First frame or landmarks count changed
    previousLandmarks = JSON.parse(JSON.stringify(landmarks)); // Deep clone
    return landmarks;
  }
  
  // Apply advanced smoothing with velocity consideration
  const smoothedLandmarks = landmarks.map((landmark, i) => {
    const prev = previousLandmarks[i];
    
    // Calculate velocity-based smoothing
    const dx = landmark.x - prev.x;
    const dy = landmark.y - prev.y;
    const dz = landmark.z - prev.z;
    const velocity = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Adjust smoothing factor based on velocity
    // Less smoothing for fast movements to reduce lag
    const dynSmoothing = Math.max(0.3, smoothingFactor - (velocity * 0.5));
    
    return {
      x: prev.x * dynSmoothing + landmark.x * (1 - dynSmoothing),
      y: prev.y * dynSmoothing + landmark.y * (1 - dynSmoothing),
      z: prev.z * dynSmoothing + landmark.z * (1 - dynSmoothing),
    };
  });
  
  // Update previous landmarks
  previousLandmarks = smoothedLandmarks;
  
  return smoothedLandmarks;
};

// Detect drawing gesture with improved sensitivity and stability
export const detectGesture = (landmarks: HandLandmark[]): GestureType => {
  // If no landmarks, return NONE
  if (!landmarks || landmarks.length < 21) {
    return GestureType.NONE;
  }

  try {
    // Apply smoothing to reduce jitter
    const smoothedLandmarks = smoothLandmarks(landmarks);
    
    // Get key landmark points for gesture detection
    const indexFingerTip = smoothedLandmarks[8];
    const indexFingerMCP = smoothedLandmarks[5];
    const indexFingerPIP = smoothedLandmarks[6]; // Index finger PIP joint
    const thumbTip = smoothedLandmarks[4];
    const middleFingerTip = smoothedLandmarks[12];
    const middleFingerMCP = smoothedLandmarks[9];
    const middleFingerPIP = smoothedLandmarks[10]; // Middle finger PIP joint
    
    // Improved hand position detection with ratio calculations
    // This makes detection more reliable across different hand sizes
    
    // Check if index finger is extended
    const indexExtensionY = indexFingerMCP.y - indexFingerTip.y;
    const indexFingerLength = Math.abs(indexFingerMCP.y - indexFingerPIP.y) * 2;
    const isIndexExtended = indexExtensionY > indexFingerLength * 0.5;
    
    // Check middle finger position
    const middleExtensionY = middleFingerMCP.y - middleFingerTip.y;
    const middleFingerLength = Math.abs(middleFingerMCP.y - middleFingerPIP.y) * 2;
    const isMiddleExtended = middleExtensionY > middleFingerLength * 0.5;
    
    // Check if thumb and index finger are pinched
    const thumbIndexDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexFingerTip.x, 2) + 
      Math.pow(thumbTip.y - indexFingerTip.y, 2)
    );
    
    // Calculate hand scale for adaptive thresholds
    const handScale = Math.sqrt(
      Math.pow(indexFingerMCP.x - middleFingerMCP.x, 2) + 
      Math.pow(indexFingerMCP.y - middleFingerMCP.y, 2)
    );
    
    const isPinching = thumbIndexDistance < handScale * 0.3;
    
    // Determine gesture with hysteresis for stability
    let detectedGesture = GestureType.NONE;
    
    if (isIndexExtended && !isMiddleExtended && !isPinching) {
      detectedGesture = GestureType.DRAWING;
    } else if (isPinching) {
      detectedGesture = GestureType.ERASING;
    }
    
    // Apply gesture debouncing for stability
    if (detectedGesture !== previousGesture) {
      // Clear existing timer
      if (gestureDebounceTimer !== null) {
        window.clearTimeout(gestureDebounceTimer);
      }
      
      // Set new timer
      const currentGesture = detectedGesture;
      gestureDebounceTimer = window.setTimeout(() => {
        previousGesture = currentGesture;
        gestureDebounceTimer = null;
      }, gestureDebounceDelay);
      
      // Return previous gesture during debounce period
      return previousGesture;
    }
    
    return detectedGesture;
  } catch (error) {
    console.error("Error detecting gesture:", error);
    return GestureType.NONE;
  }
};

// Function to initialize MediaPipe Hands with optimized performance settings
export const initializeMediaPipe = async (videoElement: HTMLVideoElement, onResults: (results: any) => void) => {
  try {
    // Check if MediaPipe is available
    if (!(window as any).Hands) {
      console.error("MediaPipe Hands is not loaded. Falling back to mock data.");
      return null;
    }
    
    const hands = new (window as any).Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    // Optimized settings for better performance
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // 0 for speed, 1 for balanced
      minDetectionConfidence: 0.6, 
      minTrackingConfidence: 0.6,
      selfieMode: true // Mirror the video for more intuitive drawing
    });
    
    hands.onResults(onResults);
    
    const camera = new (window as any).Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });
    
    camera.start();
    
    return hands;
  } catch (error) {
    console.error("Error initializing MediaPipe:", error);
    return null;
  }
};

// Generate visually appealing mock hand landmarks for testing
export const createMockHandLandmarks = (): HandLandmark[] => {
  // Create a more realistic hand shape with smoother motion
  const baseX = 0.5 + (Math.sin(Date.now() * 0.001) * 0.2);
  const baseY = 0.5 + (Math.cos(Date.now() * 0.0015) * 0.2);
  
  // Wrist
  const landmarks: HandLandmark[] = [{ x: baseX, y: baseY, z: 0 }];
  
  // Thumb (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX - 0.05 * (i + 1) + (Math.sin(Date.now() * 0.002) * 0.01),
      y: baseY - 0.03 * (i + 1) + (Math.cos(Date.now() * 0.0025) * 0.01),
      z: 0
    });
  }
  
  // Index finger (4 points)
  const indexFingerExtended = Math.sin(Date.now() * 0.001) > 0;
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX - 0.02 + (Math.sin(Date.now() * 0.003) * 0.005),
      y: baseY - (indexFingerExtended ? 0.1 * (i + 1) : 0.03 * (i + 1)),
      z: 0
    });
  }
  
  // Middle finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX + (Math.sin(Date.now() * 0.002) * 0.005),
      y: baseY - 0.03 * (i + 1),
      z: 0
    });
  }
  
  // Ring finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX + 0.02 + (Math.sin(Date.now() * 0.0015) * 0.005),
      y: baseY - 0.025 * (i + 1),
      z: 0
    });
  }
  
  // Pinky finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX + 0.04 + (Math.sin(Date.now() * 0.0025) * 0.005),
      y: baseY - 0.02 * (i + 1),
      z: 0
    });
  }
  
  return landmarks;
};
