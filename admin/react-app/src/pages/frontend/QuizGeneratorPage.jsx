import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Zap } from 'lucide-react';

// Hooks
import useQuestions from '../../hooks/useQuestions';
import useCourses from '../../hooks/useCourses';
import useLessons from '../../hooks/useLessons';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';

// Components
import Quiz from '../../components/frontend/Quiz';
import QuizGeneratorModal from '../../components/frontend/QuizGeneratorModal';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';

const QuizGeneratorPage = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(true);
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
      perPage: filters.numQuestions, // <-- AQUÍ ESTÁ LA CORRECCIÓN
    });
  }, [fetchQuestions]);

  const handleReset = () => {
    setQuizConfig(null);
    setIsModalOpen(true);
  };

  if (!quizConfig) {
    return (
      <div className="p-6">
        <PageHeader
          title={t('sidebar.quizGenerator')}
          description="Crea un cuestionario personalizado basado en tus propios filtros."
        />
        <EmptyState
          icon={Zap}
          title="Generador de Cuestionarios"
          description="Haz clic en el botón para empezar a configurar tu cuestionario."
          actionText="Crear Cuestionario"
          onAction={() => setIsModalOpen(true)}
        />
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

  if (questionsLoading) {
    return <div className="p-6">Cargando preguntas...</div>;
  }

  const generatedQuiz = {
    id: 'custom',
    title: { rendered: 'Cuestionario Personalizado' },
    meta: {
      _quiz_question_ids: questions.map(q => q.id),
      _time_limit: quizConfig.timeLimit || 0,
      _passing_score: 70, // Default passing score
    },
    question_count: questions.length
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cuestionario Generado</h1>
        <Button onClick={handleReset} variant="secondary">
          Crear Otro Cuestionario
        </Button>
      </div>
      <Quiz quizId={'custom'} customQuiz={generatedQuiz} />
    </div>
  );
};

export default QuizGeneratorPage;