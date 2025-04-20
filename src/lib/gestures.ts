
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

// Detect drawing gesture based on hand landmarks
// This is a simple implementation - can be refined for more gestures
export const detectGesture = (landmarks: HandLandmark[]): GestureType => {
  // If no landmarks, return NONE
  if (!landmarks || landmarks.length < 21) {
    return GestureType.NONE;
  }

  try {
    // Check if index finger is extended and thumb is not
    // Index finger tip is landmark 8, index finger MCP is landmark 5
    // Thumb tip is landmark 4
    const indexFingerTip = landmarks[8];
    const indexFingerMCP = landmarks[5];
    const thumbTip = landmarks[4];
    const middleFingerTip = landmarks[12];
    
    // Check if index finger is extended (tip is above MCP)
    const isIndexExtended = indexFingerTip.y < indexFingerMCP.y;
    
    // Check if thumb and index finger are not pinched together
    const thumbIndexDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexFingerTip.x, 2) + 
      Math.pow(thumbTip.y - indexFingerTip.y, 2)
    );
    
    const isPinching = thumbIndexDistance < 0.1; // Threshold for pinch
    
    // Middle finger position relative to index finger
    const isMiddleDown = middleFingerTip.y > indexFingerMCP.y;
    
    if (isIndexExtended && !isPinching && isMiddleDown) {
      return GestureType.DRAWING;
    } else if (isPinching) {
      return GestureType.ERASING;
    }
    
    return GestureType.NONE;
  } catch (error) {
    console.error("Error detecting gesture:", error);
    return GestureType.NONE;
  }
};

// Function to initialize MediaPipe Hands in browser
export const initializeMediaPipe = async (videoElement: HTMLVideoElement, onResults: (results: any) => void) => {
  try {
    // Check if MediaPipe is available (loaded via CDN)
    if (!(window as any).Hands) {
      console.error("MediaPipe Hands is not loaded. Falling back to mock data.");
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
      minTrackingConfidence: 0.5
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

// Generate mock hand landmarks for testing without camera
export const createMockHandLandmarks = (): HandLandmark[] => {
  // Create a more realistic hand shape for testing
  const baseX = 0.5 + (Math.random() * 0.2 - 0.1);
  const baseY = 0.5 + (Math.random() * 0.2 - 0.1);
  
  // Wrist
  const landmarks: HandLandmark[] = [{ x: baseX, y: baseY, z: 0 }];
  
  // Thumb (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX - 0.05 * (i + 1),
      y: baseY - 0.03 * (i + 1),
      z: 0
    });
  }
  
  // Index finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX - 0.02,
      y: baseY - 0.05 * (i + 1),
      z: 0
    });
  }
  
  // Middle finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX,
      y: baseY - 0.04 * (i + 1),
      z: 0
    });
  }
  
  // Ring finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX + 0.02,
      y: baseY - 0.03 * (i + 1),
      z: 0
    });
  }
  
  // Pinky finger (4 points)
  for (let i = 0; i < 4; i++) {
    landmarks.push({
      x: baseX + 0.04,
      y: baseY - 0.02 * (i + 1),
      z: 0
    });
  }
  
  // Randomly decide if drawing gesture
  if (Math.random() > 0.5) {
    // Make index finger extended for drawing gesture
    landmarks[8].y = baseY - 0.25;
  }
  
  return landmarks;
};
