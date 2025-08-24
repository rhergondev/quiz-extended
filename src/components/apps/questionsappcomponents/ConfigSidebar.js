import React from 'react';
import Dropdown from '../../common/Dropdown.jsx';

// Exportar las opciones para uso externo
export const opcionesDificultad = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
];

export const opcionesCategoria = [
  { value: 'ingles', label: 'Ingles' },
  { value: 'enp', label: 'ENP' },
  { value: 'psicotecnico', label: 'Piscotecnico' },
  { value: 'policial', label: 'Policial' },
];

export const opcionesTema = [
  { value: 'tema1.1', label: 'Tema 1.1' },
  { value: 'tema1.2', label: 'Tema 1.2' },
  { value: 'tema1.3', label: 'Tema 1.3' },
  { value: 'tema1.4', label: 'Tema 1.4' },
];

export const opcionesEstado = [
  { value: 'nueva', label: 'Nueva' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'archivado', label: 'Archivado' },
];

// Configuración de campos dinámica
export const configFields = [
  {
    name: 'dificultad',
    title: 'Dificultad:',
    options: opcionesDificultad,
    required: true
  },
  {
    name: 'categoria',
    title: 'Categoría:',
    options: opcionesCategoria,
    required: true
  },
  {
    name: 'tema',
    title: 'Tema:',
    options: opcionesTema,
    required: true
  },
  {
    name: 'estado',
    title: 'Estado:',
    options: opcionesEstado,
    required: false // Este podría ser opcional
  }
];

export const generateEmptyConfig = () => {
  const emptyConfig = {};
  
  configFields.forEach(field => {
    emptyConfig[field.name] = ''; // Valores vacíos inicialmente
  });
  
  return emptyConfig;
};

// Función para generar configuración por defecto (para fallbacks)
export const generateDefaultConfig = () => {
  const defaultConfig = {};
  
  configFields.forEach(field => {
    if (field.options && field.options.length > 0) {
      if (field.name === 'estado') {
        // Para estado, preferir 'borrador' si existe
        const defaultOption = field.options.find(opt => opt.value === 'borrador') || field.options[0];
        defaultConfig[field.name] = defaultOption.value;
      } else {
        // Para otros campos, tomar el primer valor
        defaultConfig[field.name] = field.options[0].value;
      }
    }
  });
  
  return defaultConfig;
};

const ConfigSidebar = ({ configuracion, onChange }) => {
  return (
    <aside className="h-full w-full md:w-80 p-4 bg-gray-50 border-l border-gray-200 flex flex-col gap-5">
      
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Configuración de la Pregunta
      </h3>

      {configFields.map(field => (
        <Dropdown
          key={field.name}
          title={field.title}
          name={`config.${field.name}`}
          value={configuracion[field.name] || ''}
          onChange={onChange}
          options={field.options}
        />
      ))}
    </aside>
  );
};

export default ConfigSidebar;