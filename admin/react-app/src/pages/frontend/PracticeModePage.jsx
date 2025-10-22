import React, { useState, useCallback } from 'react';
import { BookCheck, Settings, Zap, RotateCcw, Info } from 'lucide-react';

// Hooks
import useQuestions from '../../hooks/useQuestions';
import useCourses from '../../hooks/useCourses';
import useLessons from '../../hooks/useLessons';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';

// Components
import PracticeQuiz from '../../components/frontend/PracticeQuiz';
import QuizGeneratorModal from '../../components/frontend/QuizGeneratorModal';

const PracticeModePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quizConfig, setQuizConfig] = useState(null);

  // Fetch data for filters
  const { courses, loading: coursesLoading } = useCourses({ perPage: 100 });
  const { lessons, loading: lessonsLoading } = useLessons({ perPage: 100 });
  const { options: taxonomyOptions, isLoading: taxonomiesLoading } = useTaxonomyOptions(['qe_category', 'qe_difficulty']);

  // Hook for fetching questions, but with autoFetch disabled
  const { questions, loading: questionsLoading, fetchQuestions } = useQuestions({ 
    autoFetch: false,
    perPage: 100 // Fetch more questions to allow filtering
  });

  const handleGeneratePractice = useCallback(async (filters) => {
    setQuizConfig(filters);
    setIsModalOpen(false);
    
    // Fetch ALL questions (we'll filter in frontend)
    await fetchQuestions(true, {
      perPage: 100, // Get enough questions
      status: 'publish'
    });
  }, [fetchQuestions]);

  const handleReset = () => {
    setQuizConfig(null);
    setIsModalOpen(false);
  };

  const handleOpenConfig = () => {
    setIsModalOpen(true);
  };

  // Pantalla inicial antes de configurar
  if (!quizConfig) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl mb-6 shadow-lg">
              <BookCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              Modo Práctica
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Practica sin presión: sin límite de tiempo, sin puntuaciones ni penalizaciones
            </p>
          </div>

          {/* Características del modo práctica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Sin Presión</h3>
              <p className="text-sm text-gray-600">
                No hay límite de tiempo ni puntuaciones. Enfócate en aprender
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                <Info className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Retroalimentación Inmediata</h3>
              <p className="text-sm text-gray-600">
                Ve las respuestas correctas y explicaciones al finalizar
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Ilimitado</h3>
              <p className="text-sm text-gray-600">
                Repite cuantas veces quieras. Ideal para reforzar conocimientos
              </p>
            </div>
          </div>

          {/* Diferencias con el modo normal */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-10">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                  ¿En qué se diferencia del modo normal?
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>✅ Sin cronómetro ni límite de tiempo</li>
                  <li>✅ No se registra puntuación ni se afecta tu ranking</li>
                  <li>✅ No hay penalizaciones por respuestas incorrectas</li>
                  <li>✅ Perfecto para aprender sin estrés</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botón principal */}
          <div className="text-center">
            <button
              onClick={handleOpenConfig}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Settings className="w-5 h-5 mr-2" />
              Configurar Práctica
            </button>
          </div>

          {/* Info adicional */}
          <div className="mt-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start space-x-3">
              <BookCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Consejo de estudio
                </h4>
                <p className="text-sm text-blue-700">
                  El modo práctica es ideal para familiarizarte con el tipo de preguntas y repasar conceptos 
                  antes de realizar un test formal. Tómate tu tiempo y asegúrate de entender cada respuesta.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de configuración */}
        {isModalOpen && (
          <QuizGeneratorModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onGenerate={handleGeneratePractice}
            courses={courses}
            lessons={lessons}
            categories={taxonomyOptions.qe_category || []}
            difficulties={taxonomyOptions.qe_difficulty || []}
            isLoading={coursesLoading || lessonsLoading || taxonomiesLoading}
            isPracticeMode={true}
          />
        )}
      </div>
    );
  }

  // Cargando preguntas
  if (questionsLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 animate-pulse">
            <BookCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Preparando tu práctica...</h2>
          <p className="text-gray-600">Seleccionando las preguntas ideales para ti</p>
        </div>
      </div>
    );
  }

  // Filtrar preguntas según los filtros seleccionados
  let filteredQuestions = [...questions];

  if (quizConfig) {
    // Filtrar por lección si está seleccionada
    if (quizConfig.lesson && quizConfig.lesson !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => {
        const questionLessons = q.meta?._lesson_ids || [];
        return questionLessons.includes(parseInt(quizConfig.lesson));
      });
    }

    // Filtrar por categoría si está seleccionada
    if (quizConfig.category && quizConfig.category !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => {
        const categories = q.qe_category || [];
        return categories.includes(parseInt(quizConfig.category));
      });
    }

    // Filtrar por dificultad si está seleccionada
    if (quizConfig.difficulty && quizConfig.difficulty !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => {
        const difficulties = q.qe_difficulty || [];
        return difficulties.includes(parseInt(quizConfig.difficulty));
      });
    }

    // Limitar al número de preguntas solicitadas
    if (quizConfig.numQuestions && filteredQuestions.length > quizConfig.numQuestions) {
      // Aleatorizar y seleccionar el número solicitado
      filteredQuestions = filteredQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, quizConfig.numQuestions);
    }
  }

  // Práctica generada
  const practiceQuiz = {
    id: 'practice',
    title: { rendered: 'Modo Práctica' },
    meta: {
      _quiz_question_ids: filteredQuestions.map(q => q.id),
      _time_limit: 0, // Sin límite de tiempo
      _passing_score: 0, // Sin puntuación mínima
    },
    question_count: filteredQuestions.length
  };

  // Si no hay preguntas después del filtrado
  if (filteredQuestions.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <BookCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No hay preguntas disponibles
            </h2>
            <p className="text-gray-600 mb-6">
              No se encontraron preguntas con los filtros seleccionados. Intenta ajustar tu configuración.
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Configurar Nueva Práctica
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Modo Práctica</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredQuestions.length} preguntas • Sin límite de tiempo • Sin puntuación
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Nueva Práctica
        </button>
      </div>
      <PracticeQuiz 
        quizId={'practice'} 
        customQuiz={practiceQuiz} 
        customQuestions={filteredQuestions}
      />
    </div>
  );
};

export default PracticeModePage;
