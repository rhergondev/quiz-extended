import React, { useState } from 'react';
import Dropdown from '../../common/SelectDropdown.js';

// --- Datos de ejemplo para los 5 Dropdowns ---
// En una aplicación real, estos datos podrían venir de una API o un archivo de configuración.

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
    tipoPregunta: 'opcion_multiple', // Valor inicial
    dificultad: 'media',
    categoria: 'ciencia',
    tiempoLimite: '30',
    estado: 'borrador',
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
    <aside>
      <h3>Configuración de la Pregunta</h3>

      <Dropdown
        label="Tipo de Pregunta:"
        name="tipoPregunta"
        value={configuracion.tipoPregunta}
        onChange={handleChange}
        options={opcionesTipoPregunta}
      />

      <Dropdown
        label="Dificultad:"
        name="dificultad"
        value={configuracion.dificultad}
        onChange={handleChange}
        options={opcionesDificultad}
      />

      <Dropdown
        label="Categoría:"
        name="categoria"
        value={configuracion.categoria}
        onChange={handleChange}
        options={opcionesCategoria}
      />

      <Dropdown
        label="Tiempo Límite:"
        name="tiempoLimite"
        value={configuracion.tiempoLimite}
        onChange={handleChange}
        options={opcionesTiempo}
      />

      <Dropdown
        label="Estado:"
        name="estado"
        value={configuracion.estado}
        onChange={handleChange}
        options={opcionesEstado}
      />

      {/* Bloque para depuración: Muestra el estado actual en tiempo real */}
      <hr style={{margin: '20px 0'}} />
      <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
        <h4>Estado Actual de la Configuración:</h4>
        <pre>{JSON.stringify(configuracion, null, 2)}</pre>
      </div>

    </aside>
  );
};

export default ConfigSidebar;