import React, { useRef, useEffect, useState, useCallback } from "react";
import { HandLandmark, GestureType } from "@/lib/gestures";
import { useToast } from "@/hooks/use-toast";
import { Circle, Square, Eraser, Pencil, Line } from "lucide-react";

export type Tool = 'draw' | 'erase' | 'line' | 'rectangle' | 'circle' | 'select';

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
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const { toast } = useToast();
  
  const startPointRef = useRef<{x: number, y: number} | null>(null);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  
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
    });
    
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    if (!handLandmarks || !isActiveDrawer || !ctxRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = ctxRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const indexFinger = handLandmarks[8];
    const x = indexFinger.x * rect.width;
    const y = indexFinger.y * rect.height;
    
    switch (gesture) {
      case GestureType.DRAWING:
        if (!isDrawing) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          setIsDrawing(true);
        } else {
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        break;
        
      case GestureType.LINE:
        if (!startPointRef.current) {
          startPointRef.current = { x, y };
        } else {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.beginPath();
            ctx.moveTo(startPointRef.current.x, startPointRef.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        }
        break;
        
      case GestureType.RECTANGLE:
        if (!startPointRef.current) {
          startPointRef.current = { x, y };
        } else {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.strokeRect(
              startPointRef.current.x,
              startPointRef.current.y,
              x - startPointRef.current.x,
              y - startPointRef.current.y
            );
          }
        }
        break;
        
      case GestureType.CIRCLE:
        if (!startPointRef.current) {
          startPointRef.current = { x, y };
        } else {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
            const radius = Math.sqrt(
              Math.pow(x - startPointRef.current.x, 2) +
              Math.pow(y - startPointRef.current.y, 2)
            );
            ctx.beginPath();
            ctx.arc(startPointRef.current.x, startPointRef.current.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
        break;
        
      case GestureType.ERASING:
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, 2 * Math.PI);
        ctx.clip();
        ctx.clearRect(x - 20, y - 20, 40, 40);
        ctx.restore();
        break;
        
      case GestureType.NONE:
        setIsDrawing(false);
        startPointRef.current = null;
        break;
    }
    
    lastPointRef.current = { x, y };
  }, [handLandmarks, gesture, isActiveDrawer]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    toast({
      title: "Canvas cleared",
      description: "Drawing canvas has been cleared"
    });
  }, [toast]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setCurrentTool('draw')}
          className={`p-2 rounded-md ${currentTool === 'draw' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          <Pencil className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentTool('line')}
          className={`p-2 rounded-md ${currentTool === 'line' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          <Line className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentTool('rectangle')}
          className={`p-2 rounded-md ${currentTool === 'rectangle' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          <Square className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentTool('circle')}
          className={`p-2 rounded-md ${currentTool === 'circle' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          <Circle className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentTool('erase')}
          className={`p-2 rounded-md ${currentTool === 'erase' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          <Eraser className="w-6 h-6" />
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full flex-1 border-2 border-gray-300 rounded-lg bg-white touch-none"
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
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas;
