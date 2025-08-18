import React, { useState } from 'react';
import Dropdown from '../../common/Dropdown.jsx';

const opcionesTipoPregunta = [
  { value: 'opcion_multiple', label: 'Opción Múltiple' },
  { value: 'verdadero_falso', label: 'Verdadero / Falso' },
  { value: 'respuesta_corta', label: 'Respuesta Corta' },
];

const opcionesDificultad = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
];

const opcionesCategoria = [
  { value: 'historia', label: 'Historia' },
  { value: 'ciencia', label: 'Ciencia' },
  { value: 'arte', label: 'Arte' },
  { value: 'geografia', label: 'Geografía' },
];

const opcionesTiempo = [
  { value: '15', label: '15 segundos' },
  { value: '30', label: '30 segundos' },
  { value: '60', label: '60 segundos' },
  { value: '90', label: '90 segundos' },
];

const opcionesEstado = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'archivado', label: 'Archivado' },
];


const ConfigSidebar = () => {
  // Estado único para almacenar la configuración de la barra lateral
  const [configuracion, setConfiguracion] = useState({
    tipoPregunta: null,
    dificultad: null,
    categoria: null,
    tiempoLimite: null,
    estado: null,
  });

  // Manejador único para todos los cambios en los dropdowns
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfiguracion(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  return (
    <aside className="h-full w-full md:w-80 p-4 bg-gray-50 border-l border-gray-200 flex flex-col gap-5">
      
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Configuración de la Pregunta
      </h3>

      <Dropdown
        title="Tipo de Pregunta:"
        name="tipoPregunta"
        value={configuracion.tipoPregunta}
        onChange={handleChange}
        options={opcionesTipoPregunta}
      />

      <Dropdown
        title="Dificultad:"
        name="dificultad"
        value={configuracion.dificultad}
        onChange={handleChange}
        options={opcionesDificultad}
      />

      <Dropdown
        title="Categoría:"
        name="categoria"
        value={configuracion.categoria}
        onChange={handleChange}
        options={opcionesCategoria}
      />

      <Dropdown
        title="Tiempo Límite:"
        name="tiempoLimite"
        value={configuracion.tiempoLimite}
        onChange={handleChange}
        options={opcionesTiempo}
      />

      <Dropdown
        title="Estado:"
        name="estado"
        value={configuracion.estado}
        onChange={handleChange}
        options={opcionesEstado}
      />
    </aside>
  );
};

export default ConfigSidebar;