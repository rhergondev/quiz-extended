import React from 'react';

/**
 * Renderiza una estructura de layout de dos columnas (Master-Detail).
 * @param {object} props
 * @param {React.ReactNode} props.master - El componente para la columna izquierda (la lista).
 * @param {React.ReactNode} props.detail - El componente para la columna derecha (el editor).
 */
const MasterDetailLayout = ({ master, detail }) => {
  return (
    <div className="grid grid-cols-10 gap-6 h-full max-w-screen mx-auto">
      <div className="col-span-10 lg:col-span-2 h-[calc(100vh-8rem)]">
        {master}
      </div>
      <div className="col-span-10 lg:col-span-8 h-[calc(100vh-8rem)]">
        {detail}
      </div>
    </div>
  );
};

export default MasterDetailLayout;
