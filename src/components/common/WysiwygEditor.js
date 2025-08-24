import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './WysiwygEditor.css';

const WysiwygEditor = ({ 
  label, 
  name, 
  value, 
  onChange, 
  placeholder = "Escribe aquí la explicación...",
  maxLength = 1000,
  error = null,
  helpText = null
}) => {
  
  const handleChange = (content, delta, source, editor) => {
    // Obtener texto plano para contar caracteres
    const textLength = editor.getText().trim().length;
    
    // Verificar límite de caracteres
    if (textLength <= maxLength) {
      const event = {
        target: { name: name, value: content }
      };
      onChange(event);
    }
  };

  // Configuración de la toolbar (sin imágenes por ahora)
  const modules = {
    toolbar: [
      [{ 'header': [3, 4, false] }], // Solo headers pequeños
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean'] // Botón para limpiar formato
    ],
  };

  // Formatos permitidos
  const formats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'link'
  ];

  // Contar caracteres del texto plano
  const getTextLength = () => {
    if (!value) return 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = value;
    return tempDiv.textContent.trim().length;
  };

  const textLength = getTextLength();
  const isNearLimit = textLength > maxLength * 0.8;
  const isOverLimit = textLength > maxLength;

  return (
    <div className="w-full wysiwyg-container mb-4">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      {/* Texto de ayuda */}
      {helpText && (
        <p className="text-xs text-gray-500 mb-2">{helpText}</p>
      )}
      
      {/* Editor */}
      <div className={`
        border rounded-md 
        ${error ? 'border-red-300' : 'border-gray-300'}
        ${isOverLimit ? 'border-red-400' : ''}
      `}>
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ minHeight: '120px' }}
        />
      </div>
      
      {/* Footer con contador y errores */}
      <div className="flex justify-between items-center mt-1">
        <div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
        
        {/* Contador de caracteres */}
        <div className={`text-xs ${
          isOverLimit ? 'text-red-600 font-medium' : 
          isNearLimit ? 'text-amber-600' : 'text-gray-500'
        }`}>
          {textLength} / {maxLength}
        </div>
      </div>
    </div>
  );
};

export default WysiwygEditor;