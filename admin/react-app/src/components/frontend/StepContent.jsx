import React, { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, FileText, CheckSquare, File } from 'lucide-react'; // Importa el icono de File
import Quiz from './Quiz';
import QuizStartConfirmation from './QuizStartConfirmation';
import PdfStep from './PdfStep';
import { getEmbedUrl } from '../../api/utils/videoUtils';

const stepIcons = {
  video: <PlayCircle className="w-5 h-5 text-blue-500" />,
  text: <FileText className="w-5 h-5 text-green-500" />,
  quiz: <CheckSquare className="w-5 h-5 text-purple-500" />,
  pdf: <File className="w-5 h-5 text-red-500" />, // Añade el icono para PDF
  default: <BookOpen className="w-5 h-5 text-gray-500" />,
};

const StepContent = ({ step, lesson, quizzes }) => {
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    setQuizStarted(false);
  }, [step]);

  const renderStepContent = (step) => {
    if (!step || !step.type) {
      return <p className="text-gray-500">Contenido del paso no disponible.</p>;
    }

    const stepData = step.data || {};

    switch (step.type) {
      case 'video':
        // 🔥 2. Usa la nueva utilidad para obtener una URL de embed robusta
        const embedUrl = getEmbedUrl(stepData.video_url);
        return (
          <div>
            {embedUrl ? (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={embedUrl}
                  title={step.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <p>La URL del video no es válida o no es compatible.</p>
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
        // Intentar obtener quiz_id de múltiples ubicaciones
        const quizId = stepData.quiz_id || step.quiz_id || step.data?.quiz_id;
        
        if (!quizId) {
          return <p>Error: No se ha especificado un ID de cuestionario para este paso.</p>;
        }
        
        const quiz = quizzes.find(q => q.id === quizId);

        // Show loading state if quiz is not yet loaded
        if (!quiz) {
          return (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-600">Cargando cuestionario...</span>
            </div>
          );
        }

        if (!quizStarted) {
          return <QuizStartConfirmation quiz={quiz} onStartQuiz={() => setQuizStarted(true)} />;
        }
        return <Quiz quizId={quizId} />;
      
      // 🔥 2. Añade el 'case' para el tipo 'pdf'
      case 'pdf':
        return <PdfStep step={step} />;
        
      default:
        return (
          <p>Tipo de paso no soportado: {step.type}</p>
        );
    }
  };

  if (!step || !lesson) {
    return (
      <div className="flex-grow lg:w-2/3 p-8 flex flex-col items-center justify-center text-center bg-white rounded-lg shadow-md">
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

  // Obtener quiz_id de múltiples ubicaciones posibles
  const quizIdForTitle = step.type === 'quiz' ? (step.data?.quiz_id || step.quiz_id) : null;
  const stepTitle = step.type === 'quiz' ? getQuizTitle(quizIdForTitle) : step.title;

 return (
    <div className="flex-grow lg:w-full bg-gray-100 h-[100%] overflow-y-auto">
      <div className="mb-6 px-6 pt-6">
        <p className="text-sm text-indigo-600 font-semibold">{lesson.title.rendered}</p>
        <h1 className="text-3xl font-bold text-gray-800 mt-1">{stepTitle}</h1>
      </div>

      <div className="border-t pt-6 px-6 pb-6">
        {renderStepContent(step)}
      </div>
    </div>
  );
};

export default StepContent;