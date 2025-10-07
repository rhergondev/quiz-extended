import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const FrontendLayout = () => {
  return (
    // 'items-start' alinea el sidebar y el main en la parte superior
    <div className="flex items-start bg-white font-sans relative">
      
      {/* Contenedor Sticky para el Sidebar */}
      {/* 'sticky top-0 h-screen' hace que se pegue arriba y ocupe el 100% de la altura de la ventana */}
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>
      
      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
      </main>
    </div>
  );
};

export default FrontendLayout;