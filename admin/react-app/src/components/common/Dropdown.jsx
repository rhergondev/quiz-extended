import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from './Button';

/**
 * Un componente de menú desplegable genérico.
 *
 * @param {object} props
 * @param {string} props.buttonText - El texto a mostrar en el botón principal.
 * @param {Array<object>} [props.options=[]] - Las opciones para el menú. Cada objeto debe tener 'value' y 'label'.
 * @param {function(string): void} props.onSelect - Callback que se ejecuta al seleccionar una opción, pasando el 'value'.
 */
const Dropdown = ({ buttonText, options = [], onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cierra el dropdown si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    if (onSelect) {
      onSelect(option.value);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <Button
          variant="secondary"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-center w-full"
        >
          {buttonText}
          <ChevronDown className="-mr-1 ml-2 h-5 w-5" />
        </Button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20"
        >
          <div className="py-1">
            {options.length > 0 ? (
              options.map((option) => (
                <a
                  key={option.value}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  {option.label}
                </a>
              ))
            ) : (
              <span className="text-gray-500 block px-4 py-2 text-sm">
                No options available
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;