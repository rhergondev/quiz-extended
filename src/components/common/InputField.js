// InputField.js
import React from 'react';

const InputField = ({ label, type = 'text', name, value, onChange, placeholder }) => {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
};

export default InputField;