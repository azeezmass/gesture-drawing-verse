import React, { useRef, useEffect, useState, useCallback } from "react";
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
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPoint, setPrevPoint] = useState<{ x: number; y: number } | null>(null);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  
  const animationRef = useRef<number | null>(null);
  const pointsQueueRef = useRef<Array<{x: number, y: number}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    ctxRef.current = ctx;
  }, []);
  
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = ctxRef.current;
      if (!ctx) return;
      
      const currentDrawing = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      
      ctx.scale(dpr, dpr);
      ctx.putImageData(currentDrawing, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.imageSmoothingEnabled = true;
    };
    
    let resizeTimer: number;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(handleResize, 100);
    };
    
    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [strokeColor, strokeWidth]);
  
  const drawPoints = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const points = pointsQueueRef.current;
    if (points.length < 2) {
      animationRef.current = requestAnimationFrame(drawPoints);
      return;
    }
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    if (points.length > 1) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    
    ctx.stroke();
    
    pointsQueueRef.current = [points[points.length - 1]];
    
    animationRef.current = requestAnimationFrame(drawPoints);
  }, []);
  
  useEffect(() => {
    if (isDrawing) {
      animationRef.current = requestAnimationFrame(drawPoints);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDrawing, drawPoints]);
  
  useEffect(() => {
    if (!handLandmarks || !isActiveDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    if (handLandmarks.length >= 9) {
      const indexFinger = handLandmarks[8];
      
      const rect = canvas.getBoundingClientRect();
      const x = indexFinger.x * rect.width;
      const y = indexFinger.y * rect.height;
      
      const shouldDraw = gesture === GestureType.DRAWING;
      
      if (shouldDraw) {
        if (!isDrawing) {
          pointsQueueRef.current = [{ x, y }];
          setIsDrawing(true);
        } else {
          pointsQueueRef.current.push({ x, y });
        }
      } else if (isDrawing) {
        setIsDrawing(false);
        
        const imageData = ctx.getImageData(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        setStrokeHistory(prev => [...prev, imageData]);
        
        pointsQueueRef.current = [];
      }
      
      setPrevPoint({ x, y });
    }
  }, [handLandmarks, gesture, isDrawing, isActiveDrawer]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    pointsQueueRef.current = [{ x, y }];
    setIsDrawing(true);
    setPrevPoint({ x, y });
    
    canvas.setPointerCapture(e.pointerId);
  }, [isActiveDrawer]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    pointsQueueRef.current.push({ x, y });
    setPrevPoint({ x, y });
  }, [isActiveDrawer, isDrawing]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    setIsDrawing(false);
    
    const imageData = ctx.getImageData(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    setStrokeHistory(prev => [...prev, imageData]);
    
    pointsQueueRef.current = [];
  }, [isActiveDrawer, isDrawing]);
  
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    setStrokeHistory([]);
    pointsQueueRef.current = [];
  }, []);
  
  const undoLastStroke = useCallback(() => {
    if (strokeHistory.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const newHistory = [...strokeHistory];
    newHistory.pop();
    setStrokeHistory(newHistory);
    
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    
    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  }, [strokeHistory]);
  
  return (
    <div className="relative w-full h-full flex flex-col">
      <canvas
        ref={canvasRef}
        className="w-full flex-1 border-2 border-gray-300 rounded-lg bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
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
