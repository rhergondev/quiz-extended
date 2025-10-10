import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const FrontendLayout = () => {
  const location = useLocation();
  const layoutRef = useRef(null);

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
    <div ref={layoutRef} className="flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FrontendLayout;