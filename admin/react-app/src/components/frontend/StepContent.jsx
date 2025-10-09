// src/components/frontend/StepContent.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, FileText, CheckSquare } from 'lucide-react';
import Quiz from './Quiz';
import QuizStartConfirmation from './QuizStartConfirmation'; // Importado

const stepIcons = {
  video: <PlayCircle className="w-5 h-5 text-blue-500" />,
  text: <FileText className="w-5 h-5 text-green-500" />,
  quiz: <CheckSquare className="w-5 h-5 text-purple-500" />,
  default: <BookOpen className="w-5 h-5 text-gray-500" />,
};

const StepContent = ({ step, lesson, quizzes }) => {
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    // Reiniciar el estado del quiz si el paso cambia
    setQuizStarted(false);
  }, [step]);

  const renderStepContent = (step) => {
    if (!step || !step.type) {
      return <p className="text-gray-500">Contenido del paso no disponible.</p>;
    }

    const stepData = step.data || {};

    switch (step.type) {
      case 'video':
        const videoUrl = stepData.video_url ? stepData.video_url.replace("watch?v=", "embed/") : '';
        return (
          <div>
            {videoUrl ? (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={videoUrl}
                  title={step.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <p>URL del video no encontrada.</p>
            )}
          </div>
        );
      case 'text':
        return (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: stepData.content || 'No hay contenido de texto.' }}
          />
        );
      case 'quiz':
        const quizId = stepData.quiz_id;
        if (!quizId) {
          return <p>Error: No se ha especificado un ID de cuestionario para este paso.</p>;
        }
        const quiz = quizzes.find(q => q.id === quizId);

        if (!quizStarted) {
          return <QuizStartConfirmation quiz={quiz} onStartQuiz={() => setQuizStarted(true)} />;
        }
        return <Quiz quizId={quizId} />;
      default:
        return (
          <p>Tipo de paso no soportado: {step.type}</p>
        );
    }
  };

  if (!step || !lesson) {
    return (
      <div className="flex-grow lg:w-2/3 p-8 flex flex-col items-center justify-center text-center bg-white rounded-lg shadow-md lg:h-[97vh]">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Selecciona un paso</h2>
        <p className="text-gray-500 mt-2">Elige un paso de la lista de lecciones para ver su contenido.</p>
      </div>
    );
  }

  const getQuizTitle = (quizId) => {
    if (!quizzes || quizzes.length === 0) return 'Cuestionario';
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz ? (quiz.title.rendered || quiz.title) : 'Cuestionario';
  };

  const stepTitle = step.type === 'quiz' ? getQuizTitle(step.data.quiz_id) : step.title;

 return (
    <div className="flex-grow lg:w-2/3 bg-white h-screen overflow-y-auto">
      <div className="mb-6 px-6 pt-6">
        <p className="text-sm text-indigo-600 font-semibold">{lesson.title}</p>
        <h1 className="text-3xl font-bold text-gray-800 mt-1">{stepTitle}</h1>
      </div>

      <div className="border-t pt-6 px-6 pb-6">
        {renderStepContent(step)}
      </div>
    </div>
  );
};

export default StepContent;