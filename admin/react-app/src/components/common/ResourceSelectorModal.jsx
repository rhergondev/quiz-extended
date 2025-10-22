import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Check } from 'lucide-react';

import FilterBar from './FilterBar';
import Button from './Button';

const ResourceSelectorModal = ({
  isOpen,
  onClose,
  onAdd,
  resourceName,
  useResourceHook,
  itemsKey = 'items',
  filterConfigs = [],
  alreadyAddedIds = []
}) => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState([]);

  // --- Lógica de búsqueda con debounce local ---
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // --- CORRECCIÓN DEFINITIVA: Dejar que el hook gestione el fetching automáticamente ---
  // 1. Pasamos el término de búsqueda directamente al hook.
  // 2. El hook se configura con `autoFetch: true` por defecto, por lo que se ejecutará
  //    automáticamente cada vez que `debouncedSearchTerm` cambie.
  const resourceHook = useResourceHook({ search: debouncedSearchTerm, perPage: 100 });
  const itemsToRender = resourceHook[itemsKey] || [];


  const searchConfig = useMemo(() => ({
    value: searchTerm,
    onChange: (e) => setSearchTerm(e.target.value),
    placeholder: `Buscar ${resourceName}...`,
    isLoading: resourceHook.loading,
  }), [searchTerm, resourceHook.loading, resourceName]);

  const handleToggleItem = (item) => {
    setSelectedItems(prev =>
      prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  const handleAddAndContinue = () => {
    if (selectedItems.length > 0) {
      onAdd(selectedItems);
      setSelectedItems([]);
    }
  };

  const handleAddAndClose = () => {
    if (selectedItems.length > 0) {
        onAdd([...selectedItems]);
    }
    setSelectedItems([]);
    onClose();
  };
  
  // Limpiar el estado cuando el modal se cierra para la siguiente vez
  useEffect(() => {
    if(!isOpen) {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setSelectedItems([]);
    }
  }, [isOpen])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Seleccionar {resourceName}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </header>

          <div className="p-4 border-b">
            <FilterBar searchConfig={searchConfig} filtersConfig={filterConfigs} />
          </div>

          <main className="flex-1 overflow-y-auto p-2">
            {resourceHook.loading && <p className="p-4 text-center text-gray-500">Cargando...</p>}
            {!resourceHook.loading && itemsToRender.map(item => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              const isAlreadyAdded = alreadyAddedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => !isAlreadyAdded && handleToggleItem(item)}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${isAlreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span>{item.title?.rendered || item.title}</span>
                  </div>
                  {isAlreadyAdded && <span className="text-xs font-semibold text-gray-500">AÑADIDO</span>}
                </div>
              );
            })}
            {!resourceHook.loading && itemsToRender.length === 0 && <p className="p-4 text-center text-gray-500">No se encontraron resultados.</p>}
          </main>

          <footer className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">{selectedItems.length} seleccionados</p>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleAddAndContinue} disabled={selectedItems.length === 0}>
                Añadir y Seguir
              </Button>
              <Button variant="primary" onClick={handleAddAndClose} disabled={selectedItems.length === 0}>
                Añadir y Cerrar
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ResourceSelectorModal;