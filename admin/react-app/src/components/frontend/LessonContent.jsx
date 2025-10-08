import React from 'react';
import { PlayCircle, FileText, CheckSquare, BookOpen } from 'lucide-react';

// Iconos para cada tipo de paso
const stepIcons = {
  video: <PlayCircle className="w-5 h-5 text-blue-500" />,
  text: <FileText className="w-5 h-5 text-green-500" />,
  quiz: <CheckSquare className="w-5 h-5 text-purple-500" />,
  default: <BookOpen className="w-5 h-5 text-gray-500" />,
};

const LessonContent = ({ lesson }) => {
  // Si no hay ninguna lección seleccionada, muestra un mensaje
  if (!lesson) {
    return (
      <div className="flex-grow lg:w-2/3 p-8 flex flex-col items-center justify-center text-center bg-white rounded-lg shadow-md">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Selecciona una lección</h2>
        <p className="text-gray-500 mt-2">Elige una lección de la lista para ver su contenido aquí.</p>
      </div>
    );
  }

  const { title, content, meta } = lesson;
  const steps = meta?._lesson_steps || [];

  return (
    <div className="flex-grow lg:w-2/3 p-6 bg-white rounded-lg shadow-md">
      {/* Título de la lección */}
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{title}</h1>
      
      {/* Contenido principal (si existe) */}
      {content && (
        <div 
          className="prose max-w-none mb-8" 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      )}

      {/* Pasos de la lección */}
      {steps.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-t pt-4">Contenido de la lección</h3>
          <ul className="space-y-4">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0 mr-4">
                  {stepIcons[step.type] || stepIcons.default}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{step.title}</h4>
                  {/* Aquí podrías renderizar más detalles del paso si los tuvieras */}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LessonContent;