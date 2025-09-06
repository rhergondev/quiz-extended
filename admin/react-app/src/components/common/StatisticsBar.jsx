import React from 'react';

/**
 * Componente genérico para mostrar una barra de estadísticas
 * 
 * @param {Object} props
 * @param {Array} props.stats - Array de objetos con estadísticas
 * @param {string} props.stats[].label - Etiqueta de la estadística
 * @param {number|string} props.stats[].value - Valor a mostrar
 * @param {React.Component} props.stats[].icon - Icono de Lucide React
 * @param {string} [props.stats[].iconColor='text-gray-400'] - Color del icono
 * @param {string} [props.stats[].bgColor='bg-white'] - Color de fondo de la tarjeta
 * @param {string} [props.className] - Clases CSS adicionales
 * @param {number} [props.cols=7] - Número de columnas en el grid
 */
const StatisticsBar = ({ 
  stats = [], 
  className = '',
  cols = 7
}) => {
  if (!stats.length) return null;

  // Generar clases de grid dinámicamente
  const gridCols = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2', 
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8'
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols[cols] || 'lg:grid-cols-7'} gap-4 ${className}`}>
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        
        return (
          <div 
            key={index}
            className={`${stat.bgColor || 'bg-white'} overflow-hidden shadow rounded-lg border border-gray-200`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <IconComponent className={`h-8 w-8 ${stat.iconColor || 'text-gray-400'}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatisticsBar;