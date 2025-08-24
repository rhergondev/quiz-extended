import React from 'react';

const InputField = ({ 
  label, 
  type = 'text', 
  name, 
  value, 
  onChange, 
  placeholder,
  required = false,
  maxLength = null,
  disabled = false,
  error = null,
  helpText = null
}) => {
  
  // Calcular el conteo de caracteres si hay maxLength
  const showCharCount = maxLength && type === 'text';
  const isNearLimit = showCharCount && value && value.length > maxLength * 0.8;
  const isOverLimit = showCharCount && value && value.length > maxLength;

  return (
    <div className="w-full mb-4">
      
      {/* Etiqueta (Label) */}
      <label 
        htmlFor={name} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Texto de ayuda (opcional) */}
      {helpText && (
        <p className="text-xs text-gray-500 mb-2">{helpText}</p>
      )}
      
      {/* Campo de entrada (Input) */}
      <input
        type={type}
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        className={`
          block w-full px-3 py-2 
          border rounded-md shadow-sm 
          placeholder-gray-400 
          focus:outline-none focus:ring-2 focus:ring-offset-0
          sm:text-sm transition-colors
          ${error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : disabled
              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
          }
          ${isOverLimit ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
        `}
      />
      
      {/* Contador de caracteres y mensajes */}
      <div className="flex justify-between items-center mt-1">
        <div>
          {/* Mensaje de error */}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
        
        {/* Contador de caracteres */}
        {showCharCount && (
          <div className={`text-xs ${
            isOverLimit ? 'text-red-600 font-medium' : 
            isNearLimit ? 'text-amber-600' : 'text-gray-500'
          }`}>
            {value ? value.length : 0} / {maxLength}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputField;