import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Eraser, Trash2, Highlighter, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const DrawingCanvas = ({ isActive, onClose }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen', 'highlighter', 'eraser'
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [context, setContext] = useState(null);
  const { theme } = useTheme();

  // Configurar el canvas
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas al documento completo para que scrollee
    const resizeCanvas = () => {
      // Obtener el tamaño total del documento incluyendo scroll
      const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.clientHeight
      );
      const scrollWidth = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
        document.documentElement.clientWidth
      );
      
      canvas.width = scrollWidth;
      canvas.height = scrollHeight;
      
      // Restaurar configuración del contexto
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    // Reajustar cuando cambia el scroll (para contenido dinámico)
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(document.body);
    
    setContext(ctx);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
    };
  }, [isActive]);

  // Configurar estilo del tool actual
  useEffect(() => {
    if (!context) return;

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
    if (!context) return;
    
    setIsDrawing(true);
    // Usar pageX/pageY para tener en cuenta el scroll
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.pageX - rect.left - window.pageXOffset;
    const y = e.pageY - rect.top - window.pageYOffset;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !context) return;
    
    // Usar pageX/pageY para tener en cuenta el scroll
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.pageX - rect.left - window.pageXOffset;
    const y = e.pageY - rect.top - window.pageYOffset;
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const colors = [
    { name: 'Negro', value: '#000000' },
    { name: 'Primario', value: theme.primary },
    { name: 'Secundario', value: theme.secondary },
    { name: 'Acento', value: theme.accent },
    { name: 'Rojo', value: '#dc2626' },
    { name: 'Verde', value: '#16a34a' },
  ];

  if (!isActive) return null;

  return (
    <>
      {/* Canvas que cubre todo el documento y hace scroll */}
      <div className="fixed inset-0 pointer-events-none z-40" style={{ overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{ cursor: 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {/* Barra de herramientas flotante FIJA con animación */}
      <div className="fixed top-20 right-4 rounded-lg shadow-xl border p-3 pointer-events-auto z-50 animate-slideDown" style={{ backgroundColor: 'var(--qe-bg-card)', borderColor: 'var(--qe-border)' }}>
        <div className="flex flex-col gap-3">
          {/* Botón cerrar */}
          <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--qe-border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--qe-text)' }}>Herramientas</span>
            <button
              onClick={onClose}
              className="hover:rotate-90 transition-all duration-300"
              style={{ color: 'var(--qe-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--qe-text-secondary)'}
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Herramientas */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool('pen')}
              className="p-2 rounded transition-colors"
              style={{
                backgroundColor: tool === 'pen' ? 'var(--qe-primary)' : 'var(--qe-bg-hover)',
                color: tool === 'pen' ? 'white' : 'var(--qe-text)'
              }}
              title="Lápiz"
            >
              <Pencil className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setTool('highlighter')}
              className="p-2 rounded transition-colors"
              style={{
                backgroundColor: tool === 'highlighter' ? 'var(--qe-accent)' : 'var(--qe-bg-hover)',
                color: tool === 'highlighter' ? 'white' : 'var(--qe-text)'
              }}
              title="Subrayador"
            >
              <Highlighter className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setTool('eraser')}
              className="p-2 rounded transition-colors"
              style={{
                backgroundColor: tool === 'eraser' ? '#dc2626' : 'var(--qe-bg-hover)',
                color: tool === 'eraser' ? 'white' : 'var(--qe-text)'
              }}
              title="Borrador"
            >
              <Eraser className="w-5 h-5" />
            </button>
            
            <button
              onClick={clearCanvas}
              className="p-2 rounded transition-colors"
              style={{
                backgroundColor: 'var(--qe-bg-hover)',
                color: 'var(--qe-text)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-bg-hover)';
                e.currentTarget.style.color = 'var(--qe-text)';
              }}
              title="Limpiar todo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Selector de colores */}
          {tool !== 'eraser' && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--qe-border)' }}>
              <span className="text-xs font-medium mb-2 block" style={{ color: 'var(--qe-text-secondary)' }}>Color:</span>
              <div className="grid grid-cols-3 gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ 
                      backgroundColor: c.value,
                      borderColor: color === c.value ? 'var(--qe-text)' : 'var(--qe-border)',
                      transform: color === c.value ? 'scale(1.1)' : 'scale(1)'
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grosor de línea */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--qe-border)' }}>
            <span className="text-xs font-medium mb-2 block" style={{ color: 'var(--qe-text-secondary)' }}>Grosor:</span>
            <input
              type="range"
              min="1"
              max="5"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--qe-primary)' }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DrawingCanvas;
