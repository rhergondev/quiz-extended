import React, { useMemo } from 'react';
import { CheckCircle, XCircle, RotateCcw, BookOpen } from 'lucide-react';

const PracticeResults = ({ questions, answers, onBackToConfig }) => {
  const results = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const detailedResults = questions.map(question => {
      const userAnswer = answers[question.id];
      const correctAnswer = question.meta?._correct_answer;
      
      if (!userAnswer) {
        unanswered++;
        return {
          question,
          userAnswer: null,
          correctAnswer,
          isCorrect: false,
          wasAnswered: false,
        };
      }

      const isCorrect = userAnswer === correctAnswer;
      if (isCorrect) {
        correct++;
      } else {
        incorrect++;
      }

      return {
        question,
        userAnswer,
        correctAnswer,
        isCorrect,
        wasAnswered: true,
      };
    });

    return {
      correct,
      incorrect,
      unanswered,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
      detailedResults,
    };
  }, [questions, answers]);

  const getAnswerLabel = (option) => {
    const labels = {
      'option_a': 'A',
      'option_b': 'B',
      'option_c': 'C',
      'option_d': 'D',
    };
    return labels[option] || option;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Resumen de resultados */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full mb-4">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Práctica Completada!
          </h2>
          <p className="text-gray-600">
            Revisa tus respuestas y aprende de los errores
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {results.total}
            </div>
            <div className="text-sm text-blue-700">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {results.correct}
            </div>
            <div className="text-sm text-green-700">Correctas</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div className="text-3xl font-bold text-red-600 mb-1">
              {results.incorrect}
            </div>
            <div className="text-sm text-red-700">Incorrectas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
            <div className="text-3xl font-bold text-gray-600 mb-1">
              {results.unanswered}
            </div>
            <div className="text-sm text-gray-700">Sin responder</div>
          </div>
        </div>

        {/* Porcentaje */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-blue-900">Precisión</span>
            <span className="text-2xl font-bold text-blue-600">{results.percentage}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${results.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detalles de cada pregunta */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Revisión de Respuestas</h3>
        <div className="space-y-6">
          {results.detailedResults.map((result, index) => {
            const questionTitle = typeof result.question.title === 'object' && result.question.title?.rendered
              ? result.question.title.rendered
              : result.question.title;

            return (
              <div
                key={result.question.id}
                className={`border rounded-lg p-5 ${
                  !result.wasAnswered
                    ? 'border-gray-300 bg-gray-50'
                    : result.isCorrect
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                {/* Encabezado */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-semibold text-gray-700 border border-gray-300">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div
                        className="text-gray-800 font-medium"
                        dangerouslySetInnerHTML={{ __html: questionTitle }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {!result.wasAnswered ? (
                      <div className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                        Sin responder
                      </div>
                    ) : result.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Opciones */}
                <div className="ml-11 space-y-2">
                  {['option_a', 'option_b', 'option_c', 'option_d'].map(option => {
                    const optionText = result.question.meta?.[`_${option}`];
                    if (!optionText) return null;

                    const isUserAnswer = result.userAnswer === option;
                    const isCorrectAnswer = result.correctAnswer === option;

                    return (
                      <div
                        key={option}
                        className={`p-3 rounded-lg border ${
                          isCorrectAnswer
                            ? 'border-green-500 bg-green-100'
                            : isUserAnswer
                            ? 'border-red-500 bg-red-100'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-700">
                              {getAnswerLabel(option)}.
                            </span>
                            <span
                              className="text-gray-800"
                              dangerouslySetInnerHTML={{ __html: optionText }}
                            />
                          </div>
                          {isCorrectAnswer && (
                            <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded">
                              Correcta
                            </span>
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <span className="text-xs font-medium text-red-700 bg-red-200 px-2 py-1 rounded">
                              Tu respuesta
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explicación si existe */}
                {result.question.meta?._explanation && (
                  <div className="ml-11 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-blue-900 mb-1">Explicación</div>
                        <div
                          className="text-sm text-blue-800"
                          dangerouslySetInnerHTML={{ __html: result.question.meta._explanation }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PracticeResults;
