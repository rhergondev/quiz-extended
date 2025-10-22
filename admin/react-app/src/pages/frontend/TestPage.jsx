import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, BookCheck, ClipboardList, BookOpen } from 'lucide-react';

const TestPage = () => {
  const navigate = useNavigate();

  const testOptions = [
    {
      id: 'generator',
      title: 'Generador de Test',
      description: 'Crea cuestionarios personalizados seleccionando preguntas por categoría, dificultad y proveedor',
      icon: Sparkles,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      hoverBg: 'hover:bg-purple-100',
      borderColor: 'border-purple-200',
      route: '/quiz-generator',
      available: true
    },
    {
      id: 'practice',
      title: 'Modo Práctica',
      description: 'Practica con preguntas aleatorias sin límite de tiempo ni penalizaciones',
      icon: BookCheck,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      hoverBg: 'hover:bg-blue-100',
      borderColor: 'border-blue-200',
      route: '/test/practice',
      available: true
    },
    {
      id: 'exams',
      title: 'Exámenes Oficiales',
      description: 'Realiza exámenes completos con las condiciones y tiempos del examen real',
      icon: ClipboardList,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      hoverBg: 'hover:bg-red-100',
      borderColor: 'border-red-200',
      route: '/test/official-exams',
      available: false
    },
    {
      id: 'history',
      title: 'Historial de Tests',
      description: 'Consulta todos tus intentos anteriores y revisa tus respuestas',
      icon: FileText,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      hoverBg: 'hover:bg-green-100',
      borderColor: 'border-green-200',
      route: '/test/history',
      available: false
    },
    {
      id: 'library',
      title: 'Biblioteca de Cuestionarios',
      description: 'Accede a todos los cuestionarios disponibles organizados por curso y lección',
      icon: BookOpen,
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
      hoverBg: 'hover:bg-indigo-100',
      borderColor: 'border-indigo-200',
      route: '/test/library',
      available: true
    }
  ];

  const handleCardClick = (option) => {
    if (option.available) {
      navigate(option.route);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Test</h1>
          <p className="text-gray-600">Elige el tipo de práctica que mejor se adapte a tus necesidades</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testOptions.map((option) => {
            const Icon = option.icon;
            const isAvailable = option.available;
            
            return (
              <div
                key={option.id}
                onClick={() => handleCardClick(option)}
                className={`
                  relative bg-white rounded-lg border-2 shadow-sm p-6 transition-all duration-200
                  ${option.borderColor}
                  ${isAvailable 
                    ? `${option.hoverBg} cursor-pointer hover:shadow-md` 
                    : 'opacity-60 cursor-not-allowed'
                  }
                `}
              >
                {/* Badge de disponibilidad */}
                {!isAvailable && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">
                      Próximamente
                    </span>
                  </div>
                )}

                {/* Icono y contenido */}
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${option.bgColor}`}>
                    <Icon className={`w-8 h-8 ${option.iconColor}`} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {option.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Indicador visual para cards disponibles */}
                {isAvailable && (
                  <div className="mt-4 flex items-center text-sm font-medium text-indigo-600">
                    <span>Acceder</span>
                    <svg 
                      className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-indigo-900 mb-1">
                Sobre los Tests
              </h4>
              <p className="text-sm text-indigo-700">
                El <strong>Generador de Test</strong>, el <strong>Modo Práctica</strong> y la <strong>Biblioteca de Cuestionarios</strong> ya están disponibles. 
                Próximamente añadiremos más modalidades de práctica para mejorar tu preparación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
