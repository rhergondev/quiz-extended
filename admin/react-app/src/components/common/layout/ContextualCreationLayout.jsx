import React from 'react';
import { ChevronLeft } from 'lucide-react';

const ContextualCreationLayout = ({ collapsedParent, activeCreator, title, onBack }) => {
  return (
    <div className="flex gap-6 h-full">
      {/* Panel Padre Colapsado */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button onClick={onBack} className="mb-4 text-gray-500 hover:text-gray-800">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div
          style={{ writingMode: 'vertical-rl' }}
          className="transform rotate-180 text-sm font-semibold text-gray-600 tracking-wider uppercase whitespace-nowrap"
        >
          {title}
        </div>
      </div>

      {/* Creador Activo */}
      <div className="flex-1 h-[calc(100vh-8rem)]">
        {activeCreator}
      </div>
    </div>
  );
};

export default ContextualCreationLayout;
