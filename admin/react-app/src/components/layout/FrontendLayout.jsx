import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import Topbar from './Topbar';
import { useTheme } from '../../contexts/ThemeContext';

const FrontendLayout = () => {
  const location = useLocation();
  const { courseId } = useParams();
  const layoutRef = useRef(null);
  const [adjustedBgColor, setAdjustedBgColor] = useState('');
  const { getColor, isDarkMode } = useTheme(); // Usar getColor directamente

  // Check if we're in a course route
  const isInCourseRoute = location.pathname.startsWith('/courses/') && courseId;
  
  // Get course name from navigation state
  const courseName = location.state?.courseName;

  // Función para determinar si un color es claro u oscuro
  const isLightColor = (color) => {
    // Convertir el color a RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calcular luminosidad usando la fórmula estándar
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Función para convertir RGB a HSL
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  };

  // Función para convertir HSL a RGB
  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  // Función para ajustar el brillo del color manteniendo el HUE
  const adjustColorBrightness = (color, percent) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Convertir a HSL
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // Ajustar solo la luminosidad (L), manteniendo H y S
    const newL = Math.max(0, Math.min(100, l + (l * percent)));
    
    // Convertir de vuelta a RGB
    const [newR, newG, newB] = hslToRgb(h, s, newL);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Calcular el color de fondo ajustado basado en el color del tema
  // Se recalcula cuando cambia el tema, el modo oscuro, o la ruta
  useEffect(() => {
    const bgColor = getColor('secondaryBackground', '#f3f4f6');
    let finalColor = bgColor;

    if (bgColor && bgColor.startsWith('#')) {
      const isLight = isLightColor(bgColor);
      // Si es claro, oscurecer 5% (restar luminosidad)
      // Si es oscuro, aclarar 5% (sumar luminosidad)
      finalColor = adjustColorBrightness(bgColor, isLight ? -0.05 : 0.05);
      setAdjustedBgColor(finalColor);
    } else {
      setAdjustedBgColor(bgColor);
    }

    // Fix para la "franja blanca": asegurar que el body y html tengan el mismo color
    // Esto cubre cualquier hueco que pueda quedar por cálculos de altura o scroll
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    
    const colorToApply = finalColor || bgColor;
    document.body.style.backgroundColor = colorToApply;
    document.documentElement.style.backgroundColor = colorToApply;
    
    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
    };
  }, [getColor, isDarkMode, location]); // Recalcular cuando cambie el tema, modo oscuro, o ruta

  // Este efecto se encarga de ajustar la altura dinámicamente.
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!layoutRef.current) return;

      // 1. Detectar Header Fijo para añadir margen si es necesario
      const headers = document.querySelectorAll('header, #masthead, .elementor-location-header');
      let header = null;
      for (let h of headers) {
        if (h.offsetHeight > 0) {
          header = h;
          break;
        }
      }
      
      let isHeaderFixed = false;
      let headerHeight = 0;
      if (header) {
        headerHeight = header.offsetHeight;
        const style = window.getComputedStyle(header);
        isHeaderFixed = style.position === 'fixed' || style.position === 'sticky';
      }

      // Resetear estilos
      layoutRef.current.style.position = 'relative';

      // Si es fijo, añadimos margen para que no tape el contenido
      if (isHeaderFixed) {
        layoutRef.current.style.marginTop = `${headerHeight}px`;
      } else {
        layoutRef.current.style.marginTop = '0px';
      }

      // 2. Calcular la altura restante
      // Usamos offsetTop para saber dónde empieza realmente nuestro contenedor en el documento
      // Esto incluye la altura de headers estáticos, admin bar, etc.
      const topPosition = layoutRef.current.offsetTop;
      
      // La altura disponible es la altura de la ventana menos la posición de inicio
      // Usamos window.innerHeight para asegurar que encaje en el viewport visible
      const availableHeight = window.innerHeight - topPosition;

      layoutRef.current.style.height = `${Math.max(0, availableHeight)}px`;
      
      // Importante: Evitar scroll en el body para que solo scrollee nuestra app
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };

    // Calculamos la altura al cargar el componente
    updateHeight();

    // Listeners para redimensionamiento y cambios
    window.addEventListener('resize', updateHeight);
    window.addEventListener('scroll', updateHeight);
    
    // Observer para detectar cambios en el tamaño del header o body (ej. carga de imágenes)
    const observer = new ResizeObserver(updateHeight);
    if (document.body) observer.observe(document.body);
    const header = document.querySelector('header, #masthead, .elementor-location-header');
    if (header) observer.observe(header);

    // Limpiamos el listener cuando el componente se desmonta
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('scroll', updateHeight);
      observer.disconnect();
      // Restaurar scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez

  const isLmsHome = location.pathname === '/';

  return (
    <div 
      ref={layoutRef} 
      className="flex flex-col w-full"
      style={{ backgroundColor: adjustedBgColor || 'var(--qe-secondary-background)' }}
    >
      <Topbar />
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        <main className="flex-1 w-full overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FrontendLayout;