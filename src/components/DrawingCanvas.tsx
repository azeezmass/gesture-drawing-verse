import React, { useRef, useEffect, useState, useCallback } from "react";
import { HandLandmark, GestureType } from "@/lib/gestures";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  
  const pointsQueueRef = useRef<Array<{x: number, y: number, pressure?: number}>>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameRateRef = useRef<number>(0);
  const lastPositionRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d", { 
      alpha: true, 
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    ctxRef.current = ctx;
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = ctxRef.current;
      if (!ctx) return;
      
      const dpr = window.devicePixelRatio || 1;
      const currentDrawing = ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr);
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
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

  const drawPoints = useCallback((timestamp: number) => {
    const ctx = ctxRef.current;
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(drawPoints);
      return;
    }
    
    if (lastTimeRef.current) {
      const delta = timestamp - lastTimeRef.current;
      frameRateRef.current = 1000 / delta;
    }
    lastTimeRef.current = timestamp;
    
    const points = pointsQueueRef.current;
    if (points.length < 2) {
      animationFrameRef.current = requestAnimationFrame(drawPoints);
      return;
    }
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 0; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        
        if (points[i+1].pressure) {
          ctx.lineWidth = strokeWidth * (points[i+1].pressure * 1.5);
        }
        
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      
      const lastPoint = points[points.length - 1];
      const secondLastPoint = points[points.length - 2];
      ctx.quadraticCurveTo(
        secondLastPoint.x, 
        secondLastPoint.y, 
        lastPoint.x, 
        lastPoint.y
      );
    }
    
    ctx.stroke();
    
    pointsQueueRef.current = points.slice(-1);
    
    animationFrameRef.current = requestAnimationFrame(drawPoints);
  }, [strokeWidth]);

  useEffect(() => {
    if (isDrawing) {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(drawPoints);
      }
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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
      const x = (1 - indexFinger.x) * rect.width;
      const y = indexFinger.y * rect.height;
      
      const shouldDraw = gesture === GestureType.DRAWING;
      
      if (shouldDraw) {
        if (!isDrawing) {
          pointsQueueRef.current = [{x, y}];
          setIsDrawing(true);
          lastPositionRef.current = {x, y};
        } else {
          const lastPoint = lastPositionRef.current || {x, y};
          const dx = x - lastPoint.x;
          const dy = y - lastPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 1) {
            if (distance > 15) {
              const steps = Math.floor(distance / 5);
              for (let i = 1; i < steps; i++) {
                const ratio = i / steps;
                pointsQueueRef.current.push({
                  x: lastPoint.x + dx * ratio,
                  y: lastPoint.y + dy * ratio
                });
              }
            }
            
            pointsQueueRef.current.push({x, y});
            lastPositionRef.current = {x, y};
          }
        }
      } else if (isDrawing) {
        setIsDrawing(false);
        lastPositionRef.current = null;
        
        const dpr = window.devicePixelRatio || 1;
        const imageData = ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr);
        setStrokeHistory(prev => [...prev, imageData]);
        
        pointsQueueRef.current = [];
      }
      
      setPrevPoint({x, y});
    }
  }, [handLandmarks, gesture, isDrawing, isActiveDrawer]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    pointsQueueRef.current = [{
      x, 
      y, 
      pressure: e.pressure > 0 ? e.pressure : undefined
    }];
    
    setIsDrawing(true);
    setPrevPoint({x, y});
    lastPositionRef.current = {x, y};
    
    canvas.setPointerCapture(e.pointerId);
  }, [isActiveDrawer, strokeColor, strokeWidth]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const lastPoint = lastPositionRef.current || {x, y};
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 1) {
      pointsQueueRef.current.push({
        x, 
        y, 
        pressure: e.pressure > 0 ? e.pressure : undefined
      });
      lastPositionRef.current = {x, y};
    }
    
    setPrevPoint({x, y});
  }, [isActiveDrawer, isDrawing]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveDrawer || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    setIsDrawing(false);
    lastPositionRef.current = null;
    
    const dpr = window.devicePixelRatio || 1;
    const imageData = ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr);
    setStrokeHistory(prev => [...prev, imageData]);
    
    pointsQueueRef.current = [];
  }, [isActiveDrawer, isDrawing]);
  
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setStrokeHistory([]);
    pointsQueueRef.current = [];
    
    toast({
      title: "Canvas cleared",
      description: "Drawing canvas has been cleared"
    });
  }, [toast]);
  
  const undoLastStroke = useCallback(() => {
    if (strokeHistory.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const newHistory = [...strokeHistory];
    newHistory.pop();
    setStrokeHistory(newHistory);
    
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
    
    toast({
      title: "Undo",
      description: "Last stroke removed"
    });
  }, [strokeHistory, toast]);
  
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
