
import React, { useRef, useEffect, useState } from "react";
import { HandLandmark, GestureType } from "@/lib/gestures";

interface DrawingCanvasProps {
  handLandmarks?: HandLandmark[];
  gesture?: GestureType;
  isActiveDrawer: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  handLandmarks,
  gesture = GestureType.NONE,
  isActiveDrawer
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPoint, setPrevPoint] = useState<{ x: number; y: number } | null>(null);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to fill container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Set initial canvas state
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, []);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Store current drawing
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const currentDrawing = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Resize canvas
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Restore drawing
      ctx.putImageData(currentDrawing, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [strokeColor, strokeWidth]);
  
  // Process hand landmarks for drawing
  useEffect(() => {
    if (!handLandmarks || !isActiveDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Extract index fingertip position (landmark 8)
    if (handLandmarks.length >= 9) {
      const indexFinger = handLandmarks[8];
      
      // Convert normalized coordinates to canvas coordinates
      const x = indexFinger.x * canvas.width;
      const y = indexFinger.y * canvas.height;
      
      // Determine if drawing based on gesture
      const shouldDraw = gesture === GestureType.DRAWING;
      
      if (shouldDraw) {
        if (!isDrawing) {
          // Start a new line
          ctx.beginPath();
          ctx.moveTo(x, y);
          setIsDrawing(true);
        } else {
          // Continue the line
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      } else if (isDrawing) {
        // End current stroke
        ctx.closePath();
        setIsDrawing(false);
        
        // Save stroke to history
        const newStroke = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setStrokeHistory([...strokeHistory, newStroke]);
      }
      
      setPrevPoint({ x, y });
    }
  }, [handLandmarks, gesture, isDrawing, isActiveDrawer]);

  // Mouse/touch fallback for testing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setPrevPoint({ x, y });
  };
  
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setPrevPoint({ x, y });
  };
  
  const handlePointerUp = () => {
    if (!isActiveDrawer || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.closePath();
    setIsDrawing(false);
    
    // Save stroke to history
    const newStroke = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([...strokeHistory, newStroke]);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeHistory([]);
  };
  
  const undoLastStroke = () => {
    if (strokeHistory.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const newHistory = [...strokeHistory];
    newHistory.pop();
    setStrokeHistory(newHistory);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw remaining strokes
    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  };
  
  return (
    <div className="relative w-full h-full flex flex-col">
      <canvas
        ref={canvasRef}
        className="w-full flex-1 border-2 border-gray-300 rounded-lg bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
      />
      
      {isActiveDrawer && (
        <div className="flex justify-center gap-2 mt-4">
          <button 
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            onClick={clearCanvas}
          >
            Clear
          </button>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={undoLastStroke}
            disabled={strokeHistory.length === 0}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas;
