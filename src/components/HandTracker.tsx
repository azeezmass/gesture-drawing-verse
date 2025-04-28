import React, { useRef, useEffect, useState, useCallback } from "react";
import { HandLandmark, GestureType, detectGesture, createMockHandLandmarks, initializeMediaPipe } from "@/lib/gestures";

interface HandTrackerProps {
  onGestureDetected?: (landmarks: HandLandmark[], gesture: GestureType) => void;
  showVideo?: boolean;
  enabled?: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ 
  onGestureDetected, 
  showVideo = true,
  enabled = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [mediaPipeAvailable, setMediaPipeAvailable] = useState(false);
  const handResultsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const isMediaPipeAvailable = !!(window as any).Hands;
    setMediaPipeAvailable(isMediaPipeAvailable);
    
    if (!isMediaPipeAvailable) {
      console.warn("MediaPipe not available, falling back to mock data");
      setUseMockData(true);
    }
  }, []);
  
  useEffect(() => {
    if (!enabled) return;
    
    const setupCamera = async () => {
      try {
        setIsLoading(true);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser doesn't support getUserMedia");
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 } // Optimized frame rate for better performance
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.playsInline = true; // For mobile browsers
          videoRef.current.muted = true;
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(err => {
                console.error("Error playing video:", err);
                setUseMockData(true);
              });
              setIsInitialized(true);
            }
          };
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
        setUseMockData(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!useMockData) {
      setupCamera();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, useMockData]);
  
  const processResults = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const results = handResultsRef.current;
    
    if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      const handLandmarks: HandLandmark[] = landmarks.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z
      }));
      
      const gesture = detectGesture(handLandmarks, 'draw');
      
      if (canvas && ctx) {
        if ((window as any).drawConnectors) {
          (window as any).drawConnectors(
            ctx, 
            landmarks, 
            (window as any).HAND_CONNECTIONS,
            { color: '#8B5CF6', lineWidth: 2 }
          );
        }
        
        if ((window as any).drawLandmarks) {
          (window as any).drawLandmarks(
            ctx, 
            landmarks, 
            { 
              color: '#D6BCFA', 
              lineWidth: 1,
              radius: landmark => {
                return landmark.index === 8 ? 6 : 4;
              }
            }
          );
        }
        
        if (gesture === GestureType.DRAWING && landmarks[8]) {
          ctx.fillStyle = '#8B5CF6';
          ctx.beginPath();
          ctx.arc(
            landmarks[8].x * canvas.width, 
            landmarks[8].y * canvas.height, 
            8, 
            0, 
            2 * Math.PI
          );
          ctx.fill();
        }
      }
      
      if (onGestureDetected) {
        onGestureDetected(handLandmarks, gesture);
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(processResults);
  }, [onGestureDetected]);
  
  useEffect(() => {
    if (!enabled || !isInitialized || useMockData || !mediaPipeAvailable || !videoRef.current) return;
    
    let mediaPipeInstance: any = null;
    
    const initMediaPipe = async () => {
      if (!videoRef.current) return;
      
      const onResults = (results: any) => {
        handResultsRef.current = results;
        
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(processResults);
        }
      };
      
      try {
        mediaPipeInstance = await initializeMediaPipe(videoRef.current, onResults);
      } catch (err) {
        console.error("Error initializing MediaPipe:", err);
        setError(`MediaPipe error: ${err instanceof Error ? err.message : String(err)}`);
        setUseMockData(true);
      }
    };
    
    initMediaPipe();
    
    return () => {
      if (mediaPipeInstance) {
        mediaPipeInstance.close();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInitialized, onGestureDetected, useMockData, mediaPipeAvailable, enabled, processResults]);
  
  useEffect(() => {
    if (!enabled || !useMockData) return;
    
    let mockInterval: number;
    
    const processMockData = () => {
      const mockLandmarks = createMockHandLandmarks();
      const mockGesture = Math.random() > 0.7 ? GestureType.DRAWING : GestureType.NONE;
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          mockLandmarks.forEach((landmark, i) => {
            ctx.fillStyle = i === 8 && mockGesture === GestureType.DRAWING 
              ? '#8B5CF6'
              : '#D6BCFA';
            
            ctx.beginPath();
            ctx.arc(
              landmark.x * canvas.width, 
              landmark.y * canvas.height, 
              i === 8 ? 6 : 4,
              0, 
              2 * Math.PI
            );
            ctx.fill();
          });
          
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 2;
          
          for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(
              mockLandmarks[i-1].x * canvas.width,
              mockLandmarks[i-1].y * canvas.height
            );
            ctx.lineTo(
              mockLandmarks[i].x * canvas.width,
              mockLandmarks[i].y * canvas.height
            );
            ctx.stroke();
          }
          
          for (let finger = 1; finger <= 5; finger++) {
            const baseIndex = finger === 1 ? 0 : (finger - 1) * 4 + 1;
            ctx.beginPath();
            ctx.moveTo(
              mockLandmarks[0].x * canvas.width,
              mockLandmarks[0].y * canvas.height
            );
            ctx.lineTo(
              mockLandmarks[baseIndex].x * canvas.width,
              mockLandmarks[baseIndex].y * canvas.height
            );
            ctx.stroke();
          }
          
          for (let finger = 2; finger <= 5; finger++) {
            const startIndex = (finger - 1) * 4 + 1;
            for (let segment = 0; segment < 3; segment++) {
              ctx.beginPath();
              ctx.moveTo(
                mockLandmarks[startIndex + segment].x * canvas.width,
                mockLandmarks[startIndex + segment].y * canvas.height
              );
              ctx.lineTo(
                mockLandmarks[startIndex + segment + 1].x * canvas.width,
                mockLandmarks[startIndex + segment + 1].y * canvas.height
              );
              ctx.stroke();
            }
          }
        }
      }
      
      if (onGestureDetected) {
        onGestureDetected(mockLandmarks, mockGesture);
      }
    };
    
    const animateMock = () => {
      processMockData();
      animationFrameRef.current = requestAnimationFrame(animateMock);
    };
    
    animationFrameRef.current = requestAnimationFrame(animateMock);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [onGestureDetected, useMockData, enabled]);
  
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const videoContainer = canvas?.parentElement;
      
      if (canvas && videoContainer) {
        canvas.width = videoContainer.clientWidth;
        canvas.height = videoContainer.clientHeight;
      }
    };
    
    updateCanvasSize();
    
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);
  
  const toggleMode = () => {
    setUseMockData(!useMockData);
    setIsInitialized(false);
    
    if (useMockData) {
      setError(null);
    }
  };
  
  return (
    <div className="relative w-full h-full">
      <div className={`relative rounded-lg overflow-hidden h-full ${isLoading ? 'animate-pulse bg-gray-300' : ''}`}>
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${useMockData ? 'hidden' : ''}`}
          autoPlay
          playsInline
          muted
        />
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-gray-500">Loading camera...</div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50 z-20">
            <div className="text-red-500 p-4 text-sm text-center">
              {error}
              <div className="mt-2">
                <button 
                  className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs"
                  onClick={() => setUseMockData(true)}
                >
                  Use Demo Mode
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute top-2 right-2 z-30">
          <span className={`text-xs px-2 py-1 rounded ${useMockData ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}`}>
            {useMockData ? 'Demo Mode' : 'Camera Mode'}
          </span>
        </div>
        
        <div className="absolute top-2 left-2 z-30">
          <button
            onClick={toggleMode}
            className="text-xs px-2 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {useMockData ? 'Try Camera' : 'Use Demo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandTracker;
