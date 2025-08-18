import React from 'react';

const InputField = ({ label, type = 'text', name, value, onChange, placeholder }) => {
  return (
    // Contenedor principal que organiza la etiqueta y el input verticalmente
    <div className="w-full">
      
      {/* Etiqueta (Label) */}
      <label 
        htmlFor={name} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      
      {/* Campo de entrada (Input) */}
      <input
        type={type}
        id={name} // 'id' debe coincidir con el 'htmlFor' de la etiqueta para accesibilidad
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        // Clases de Tailwind para el estilo
        className="
          block w-full px-3 py-2 
          border border-gray-300 rounded-md shadow-sm 
          placeholder-gray-400 
          focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
          sm:text-sm
        "
      />
    </div>
  );
};

export default InputField;