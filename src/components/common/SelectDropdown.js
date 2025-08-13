// SelectDropdown.js
import React from 'react';

const SelectDropdown = ({ label, name, value, onChange, options }) => {
  // It's a good practice to ensure 'options' is an array
  if (!Array.isArray(options)) {
    console.error("Options prop must be an array.");
    return null;
  }

  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <select name={name} value={value} onChange={onChange}>
        {/* Map options to create each <option> */}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectDropdown;