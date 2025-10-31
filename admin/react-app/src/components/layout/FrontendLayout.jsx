import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const FrontendLayout = () => {
  const location = useLocation();
  const layoutRef = useRef(null);
  const [adjustedBgColor, setAdjustedBgColor] = useState('');

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
  useEffect(() => {
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--qe-background')
      .trim();

    if (bgColor && bgColor.startsWith('#')) {
      const isLight = isLightColor(bgColor);
      // Si es claro, oscurecer 5% (restar luminosidad)
      // Si es oscuro, aclarar 5% (sumar luminosidad)
      const adjustedColor = adjustColorBrightness(bgColor, isLight ? -0.05 : 0.05);
      setAdjustedBgColor(adjustedColor);
    }
  }, [location]); // Recalcular cuando cambie la ruta (por si cambia el tema)

  // Este efecto se encarga de ajustar la altura dinámicamente.
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!layoutRef.current) return;

      // Buscamos los elementos que están por encima de nuestra app
      const header = document.querySelector('header, #masthead, .elementor-location-header');
      const wpAdminBar = document.querySelector('#wpadminbar');

      // Obtenemos su altura
      const headerHeight = header ? header.offsetHeight : 0;
      const wpAdminBarHeight = wpAdminBar ? wpAdminBar.offsetHeight : 0;
      
      const totalOffset = headerHeight + wpAdminBarHeight;

      // Aplicamos la altura calculada a nuestro contenedor principal
      layoutRef.current.style.height = `calc(100vh - ${totalOffset}px)`;
    };

    // Calculamos la altura al cargar el componente
    updateHeight();

    // Y también si el usuario cambia el tamaño de la ventana
    window.addEventListener('resize', updateHeight);

    // Limpiamos el listener cuando el componente se desmonta
    return () => window.removeEventListener('resize', updateHeight);
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez

  const isLmsHome = location.pathname === '/';

  return (
    // 1. Añadimos la 'ref' a nuestro div.
    // 2. Eliminamos la clase 'h-screen' para que la altura se controle por JavaScript.
    <div 
      ref={layoutRef} 
      className="flex"
      style={{ backgroundColor: adjustedBgColor || 'var(--qe-background)' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FrontendLayout;