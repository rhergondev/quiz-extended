// src/components/common/WysiwygEditor.js

import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Estilos base de Quill

// -> 1. Importa un nuevo archivo CSS para los estilos personalizados
import './WysiwygEditor.css'; 

const WysiwygEditor = ({ label, name, value, onChange }) => {
  const handleChange = (content) => {
    const event = {
      target: { name: name, value: content }
    };
    onChange(event);
  };

  return (
    // -> 2. Contenedor principal con la clase 'wysiwyg-container' para aplicar estilos
    <div className="w-full wysiwyg-container">
      {/* -> 3. Etiqueta con los mismos estilos que los otros componentes */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default WysiwygEditor;