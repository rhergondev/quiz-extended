import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Sparkles, Settings, Play, RotateCcw, Filter } from 'lucide-react';

// Hooks
import useQuestions from '../../hooks/useQuestions';
import useCourses from '../../hooks/useCourses';
import useLessons from '../../hooks/useLessons';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';

// Components
import Quiz from '../../components/frontend/Quiz';
import QuizGeneratorModal from '../../components/frontend/QuizGeneratorModal';

const QuizGeneratorPage = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quizConfig, setQuizConfig] = useState(null);

  // Fetch data for filters
  const { courses, loading: coursesLoading } = useCourses({ perPage: 100 });
  const { lessons, loading: lessonsLoading } = useLessons({ perPage: 100 });
  const { options: taxonomyOptions, isLoading: taxonomiesLoading } = useTaxonomyOptions(['qe_category', 'qe_difficulty']);

  // Hook for fetching questions, but with autoFetch disabled
  const { questions, loading: questionsLoading, fetchQuestions } = useQuestions({ autoFetch: false });

  const handleGenerateQuiz = useCallback(async (filters) => {
    setQuizConfig(filters);
    setIsModalOpen(false);
    // Fetch questions based on selected filters
    await fetchQuestions(true, {
      category: filters.category !== 'all' ? filters.category : null,
      difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
      lesson: filters.lesson !== 'all' ? filters.lesson : null,
      perPage: filters.numQuestions,
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              Generador de Test
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Crea cuestionarios personalizados seleccionando el número de preguntas, categoría, dificultad y más
            </p>
          </div>

          {/* Características */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Filtros Avanzados</h3>
              <p className="text-sm text-gray-600">
                Selecciona categorías, niveles de dificultad y lecciones específicas
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Personalizable</h3>
              <p className="text-sm text-gray-600">
                Configura el número de preguntas y el tiempo límite según tus necesidades
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Listo para Usar</h3>
              <p className="text-sm text-gray-600">
                Comienza inmediatamente después de generar tu cuestionario personalizado
              </p>
            </div>
          </div>

          {/* Botón principal */}
          <div className="text-center">
            <button
              onClick={handleOpenConfig}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Sliders className="w-5 h-5 mr-2" />
              Configurar Cuestionario
            </button>
          </div>

          {/* Info adicional */}
          <div className="mt-12 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-purple-900 mb-1">
                  ¿Cómo funciona?
                </h4>
                <p className="text-sm text-purple-700">
                  1. Haz clic en "Configurar Cuestionario"
                  <br />
                  2. Selecciona tus preferencias (categoría, dificultad, número de preguntas, etc.)
                  <br />
                  3. Genera tu test personalizado y comienza a practicar
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
            onGenerate={handleGenerateQuiz}
            courses={courses}
            lessons={lessons}
            categories={taxonomyOptions.qe_category || []}
            difficulties={taxonomyOptions.qe_difficulty || []}
            isLoading={coursesLoading || lessonsLoading || taxonomiesLoading}
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Generando tu cuestionario...</h2>
          <p className="text-gray-600">Estamos seleccionando las mejores preguntas para ti</p>
        </div>
      </div>
    );
  }

  // Quiz generado
  const generatedQuiz = {
    id: 'custom',
    title: { rendered: 'Cuestionario Personalizado' },
    meta: {
      _quiz_question_ids: questions.map(q => q.id),
      _time_limit: quizConfig.timeLimit || 0,
      _passing_score: 70,
    },
    question_count: questions.length
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cuestionario Personalizado</h1>
          <p className="text-sm text-gray-600 mt-1">
            {questions.length} preguntas • 
            {quizConfig.timeLimit > 0 ? ` ${quizConfig.timeLimit} minutos` : ' Sin límite de tiempo'}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Nuevo Cuestionario
        </button>
      </div>
      <Quiz quizId={'custom'} customQuiz={generatedQuiz} />
    </div>
  );
};

export default QuizGeneratorPage;