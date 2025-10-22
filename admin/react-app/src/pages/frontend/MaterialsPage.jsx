import React from 'react';
import { BookOpen, FileText, Download } from 'lucide-react';

const MaterialsPage = () => {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Material de Apoyo</h1>
          <p className="text-gray-600">Encuentra recursos y materiales de estudio complementarios</p>
        </div>

        {/* Placeholder content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Material de Apoyo
          </h3>
          <p className="text-gray-500 mb-6">
            Esta sección estará disponible próximamente. Aquí encontrarás documentos, guías y recursos complementarios.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
            <div className="p-4 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Documentos PDF</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <BookOpen className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Guías de Estudio</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Download className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Recursos Descargables</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialsPage;
