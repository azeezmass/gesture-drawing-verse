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
  LINE = 'line',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  SELECTING = 'selecting',
}

export type Tool = 'draw' | 'erase' | 'line' | 'rectangle' | 'circle' | 'select';

// Previous landmark positions for advanced smoothing
let previousLandmarks: HandLandmark[] = [];
let previousGesture: GestureType = GestureType.NONE;
const smoothingFactor = 0.5;
let gestureDebounceTimer: number | null = null;
let gestureDebounceDelay = 100;

// Detect if index finger is raised (similar to Python implementation)
const isIndexFingerRaised = (landmarks: HandLandmark[]): boolean => {
  if (!landmarks || landmarks.length < 13) return false;
  
  const indexTip = landmarks[8];
  const indexMCP = landmarks[5];
  const middlePIP = landmarks[10];
  
  // Calculate the distance between index tip and MCP
  const distance = (indexMCP.y - indexTip.y);
  
  // Return true if index finger is raised significantly
  return distance > 0.08;
};

// Enhanced smoothing with momentum consideration
const smoothLandmarks = (landmarks: HandLandmark[]): HandLandmark[] => {
  if (previousLandmarks.length === 0) {
    previousLandmarks = JSON.parse(JSON.stringify(landmarks));
    return landmarks;
  }
  
  const smoothedLandmarks = landmarks.map((landmark, i) => {
    const prev = previousLandmarks[i];
    const dx = landmark.x - prev.x;
    const dy = landmark.y - prev.y;
    const dz = landmark.z - prev.z;
    const velocity = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const dynSmoothing = Math.max(0.2, smoothingFactor - (velocity * 0.6));
    
    return {
      x: prev.x * dynSmoothing + landmark.x * (1 - dynSmoothing),
      y: prev.y * dynSmoothing + landmark.y * (1 - dynSmoothing),
      z: prev.z * dynSmoothing + landmark.z * (1 - dynSmoothing),
    };
  });
  
  previousLandmarks = smoothedLandmarks;
  return smoothedLandmarks;
};

// Detect drawing gesture with improved sensitivity
export const detectGesture = (landmarks: HandLandmark[], currentTool: Tool): GestureType => {
  if (!landmarks || landmarks.length < 21) return GestureType.NONE;

  try {
    const smoothedLandmarks = smoothLandmarks(landmarks);
    
    const indexFingerTip = smoothedLandmarks[8];
    const indexFingerMCP = smoothedLandmarks[5];
    const middleFingerTip = smoothedLandmarks[12];
    const middleFingerMCP = smoothedLandmarks[9];
    const thumbTip = smoothedLandmarks[4];
    
    // Check if index finger is raised
    const isIndexRaised = isIndexFingerRaised(smoothedLandmarks);
    
    // Calculate hand scale for adaptive thresholds
    const handScale = Math.sqrt(
      Math.pow(indexFingerMCP.x - middleFingerMCP.x, 2) + 
      Math.pow(indexFingerMCP.y - middleFingerMCP.y, 2)
    );
    
    // Check if thumb and index finger are pinched (for erasing)
    const thumbIndexDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexFingerTip.x, 2) + 
      Math.pow(thumbTip.y - indexFingerTip.y, 2)
    );
    
    const isPinching = thumbIndexDistance < handScale * 0.35;
    
    // Determine gesture based on current tool and hand position
    if (isPinching && currentTool === 'erase') {
      return GestureType.ERASING;
    }
    
    if (isIndexRaised) {
      switch (currentTool) {
        case 'draw':
          return GestureType.DRAWING;
        case 'line':
          return GestureType.LINE;
        case 'rectangle':
          return GestureType.RECTANGLE;
        case 'circle':
          return GestureType.CIRCLE;
        default:
          return GestureType.NONE;
      }
    }
    
    return GestureType.NONE;
  } catch (error) {
    console.error("Error detecting gesture:", error);
    return GestureType.NONE;
  }
};

// Initialize MediaPipe with optimized settings
export const initializeMediaPipe = async (videoElement: HTMLVideoElement, onResults: (results: any) => void) => {
  try {
    if (!(window as any).Hands) {
      console.error("MediaPipe Hands is not loaded");
      return null;
    }
    
    const hands = new (window as any).Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true
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
