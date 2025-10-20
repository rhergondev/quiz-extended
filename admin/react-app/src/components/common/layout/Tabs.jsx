import React from 'react';
import clsx from 'clsx';

/**
 * Renderiza un sistema de pestañas simple y funcional.
 * @param {object} props
 * @param {Array<{name: string, content: React.ReactNode}>} props.tabs - Array de objetos de pestaña.
 * @param {number} [props.activeTab=0] - El índice de la pestaña activa.
 * @param {Function} [props.setActiveTab] - Función para cambiar la pestaña activa.
 */
const Tabs = ({ tabs, activeTab = 0, setActiveTab = () => {} }) => {
  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(index)}
              className={clsx(
                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm',
                {
                  'border-blue-600 text-blue-700': activeTab === index,
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== index,
                }
              )}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-6">
        {/* CORRECCIÓN: Mostrar solo el contenido de la pestaña activa */}
        {tabs[activeTab] && tabs[activeTab].content}
      </div>
    </div>
  );
};

export default Tabs;