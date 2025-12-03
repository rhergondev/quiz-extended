import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const DrawingCanvas = ({ isActive, isDrawingEnabled, tool, color, lineWidth, onClose, onClear, containerRef, showToolbar }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const { getColor } = useTheme();
  
  // Use refs to always have current values
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const lineWidthRef = useRef(lineWidth);
  
  // Update refs when props change
  useEffect(() => {
    console.log('🔄 Updating refs with new props:', { tool, color, lineWidth });
    toolRef.current = tool;
    colorRef.current = color;
    lineWidthRef.current = lineWidth;
    console.log('  → Refs now contain:', { tool: toolRef.current, color: colorRef.current, lineWidth: lineWidthRef.current });
  }, [tool, color, lineWidth]);

  // Exponer la función clearCanvas al padre
  useEffect(() => {
    if (onClear && context && canvasRef.current) {
      onClear(() => {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      });
    }
  }, [context, onClear]);

  // Configurar el canvas
  useEffect(() => {
    if (!canvasRef.current || !isActive || !containerRef?.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas al contenedor de preguntas
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = container.scrollWidth;
      canvas.height = container.scrollHeight;
      
      // Restaurar configuración del contexto
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    setContext(ctx);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
    };
  }, [isActive]);

  // Log props changes
  useEffect(() => {
    console.log('📦 DrawingCanvas props updated:', { tool, color, lineWidth, isActive, isDrawingEnabled });
  }, [tool, color, lineWidth, isActive, isDrawingEnabled]);

  // Configurar estilo del tool actual
  useEffect(() => {
    if (!context) return;

    console.log('🎨 Drawing tool changed (applying to context):', { tool, color, lineWidth });

    if (tool === 'pen') {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      context.globalCompositeOperation = 'source-over';
      // Convertir color hex a rgba con transparencia
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
      context.lineWidth = lineWidth * 4;
      context.globalAlpha = 1.0;
    } else if (tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = lineWidth * 3;
      context.globalAlpha = 1.0;
    }
  }, [context, tool, color, lineWidth]);

  const startDrawing = (e) => {
    if (!context || !containerRef?.current || !isDrawingEnabled) return;
    
    // Get current values from refs
    const currentTool = toolRef.current;
    const currentColor = colorRef.current;
    const currentLineWidth = lineWidthRef.current;
    
    console.log('✏️ Starting to draw with:', { tool: currentTool, color: currentColor, lineWidth: currentLineWidth });
    
    // Apply current tool settings before starting
    if (currentTool === 'pen') {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = currentColor;
      context.lineWidth = currentLineWidth;
      context.globalAlpha = 1.0;
      console.log('  → Applied PEN style:', { strokeStyle: context.strokeStyle, lineWidth: context.lineWidth });
    } else if (currentTool === 'highlighter') {
      context.globalCompositeOperation = 'source-over';
      const r = parseInt(currentColor.slice(1, 3), 16);
      const g = parseInt(currentColor.slice(3, 5), 16);
      const b = parseInt(currentColor.slice(5, 7), 16);
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
      context.lineWidth = currentLineWidth * 4;
      context.globalAlpha = 1.0;
      console.log('  → Applied HIGHLIGHTER style:', { strokeStyle: context.strokeStyle, lineWidth: context.lineWidth });
    } else if (currentTool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = currentLineWidth * 3;
      context.globalAlpha = 1.0;
      console.log('  → Applied ERASER style:', { compositeOperation: context.globalCompositeOperation, lineWidth: context.lineWidth });
    }
    
    setIsDrawing(true);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !context || !containerRef?.current || !isDrawingEnabled) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
  };

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0"
      style={{ 
        cursor: isDrawingEnabled ? 'crosshair' : 'default',
        zIndex: 20,
        pointerEvents: isDrawingEnabled ? 'auto' : 'none'
      }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
};

export default DrawingCanvas;
