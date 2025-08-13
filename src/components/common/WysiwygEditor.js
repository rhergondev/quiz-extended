// WysiwygEditor.js
import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Importa los estilos del tema 'snow'

const WysiwygEditor = ({ label, name, value, onChange }) => {
  // React Quill no usa e.target.value, sino que pasa el contenido HTML directamente.
  // Creamos una función 'wrapper' para adaptarlo a nuestro 'handleChange' del formulario.
  const handleChange = (content) => {
    // Simulamos la estructura del evento 'e' que esperan nuestros otros componentes
    const event = {
      target: {
        name: name,
        value: content
      }
    };
    onChange(event);
  };

  return (
    <div>
      <label>{label}</label>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default WysiwygEditor;