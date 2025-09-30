import React, { useMemo } from 'react';
import {
  Edit, Trash2, Copy, CheckCircle, Target, BookOpen, Hash, HelpCircle,
  Eye, EyeOff, Zap, User, BrainCircuit, Upload, Info, Calendar, FileText
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta refactorizado para mostrar información de una pregunta.
 * Muestra datos reales como el proveedor y la lección asociada, eliminando estadísticas simuladas.
 * * @param {Object} props
 * @param {Object} props.question - Datos de la pregunta desde la API.
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list').
 * @param {Function} [props.onEdit] - Callback para editar.
 * @param {Function} [props.onDelete] - Callback para eliminar.
 * @param {Function} [props.onDuplicate] - Callback para duplicar.
 * @param {Function} [props.onClick] - Callback para click en la tarjeta.
 * @param {Array} [props.quizzes=[]] - Lista de quizzes disponibles.
 * @param {Array} [props.availableLessons=[]] - Lista de lecciones disponibles.
 * @param {boolean} [props.showQuiz=true] - Si mostrar info del quiz/lección.
 * @param {string} [props.className] - Clases CSS adicionales.
 */
const QuestionCard = ({
  question,
  viewMode = 'cards',
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  quizzes = [],
  availableLessons = [],
  showQuiz = true,
  className = ''
}) => {
  // --- VALORES EXTRAÍDOS DE LA API ---
  const questionData = useMemo(() => ({
    id: question.id,
    title: question.title?.rendered || 'Untitled Question',
    status: question.status || 'draft',
    type: question.meta?._question_type || 'multiple_choice',
    difficulty: question.meta?._difficulty_level || 'medium',
    category: question.meta?._question_category,
    provider: question.meta?._question_provider || 'human',
    points: parseInt(question.meta?._points || '1', 10),
    explanation: question.content?.rendered.replace(/<p>|<\/p>/g, '').trim(),
    quizId: question.meta?._quiz_id,
    lessonId: question.meta?._question_lesson,
    modifiedDate: new Date(question.modified).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
  }), [question]);

  // --- BÚSQUEDA DE ENTIDADES ASOCIADAS ---
  const associatedQuiz = useMemo(() => {
    if (!questionData.quizId || !quizzes.length) return null;
    return quizzes.find(q => q.id.toString() === questionData.quizId.toString());
  }, [questionData.quizId, quizzes]);

  const associatedLesson = useMemo(() => {
    if (!questionData.lessonId || !availableLessons.length) return null;
    return availableLessons.find(l => l.id.toString() === questionData.lessonId.toString());
  }, [questionData.lessonId, availableLessons]);

  // --- FUNCIONES DE AYUDA VISUAL ---
  const getProviderInfo = (provider) => {
    switch (provider) {
      case 'human': return { label: 'Manual', icon: User };
      case 'ai_gpt4': return { label: 'AI (GPT-4)', icon: BrainCircuit };
      case 'ai_gemini': return { label: 'AI (Gemini)', icon: BrainCircuit };
      case 'imported': return { label: 'Imported', icon: Upload };
      default: return { label: 'Unknown', icon: Info };
    }
  };

  const getTypeInfo = (type) => {
    const types = {
      multiple_choice: { label: 'Multiple Choice', icon: CheckCircle },
      true_false: { label: 'True/False', icon: Target },
      short_answer: { label: 'Short Answer', icon: Edit },
      essay: { label: 'Essay', icon: FileText },
      fill_blank: { label: 'Fill in Blank', icon: Hash },
    };
    return types[type] || { label: 'Question', icon: HelpCircle };
  };
  
  const getBadgeColor = (key, value) => {
    const colors = {
      status: { publish: 'bg-green-100 text-green-700', draft: 'bg-yellow-100 text-yellow-700', private: 'bg-gray-100 text-gray-700' },
      difficulty: { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' },
    };
    return colors[key]?.[value] || 'bg-gray-100 text-gray-700';
  };

  // --- RENDERIZADO DE COMPONENTES ---
  const TypeInfo = getTypeInfo(questionData.type);
  const ProviderInfo = getProviderInfo(questionData.provider);

  const renderCardContent = () => (
    <>
      {/* Header with actions - altura fija */}
      <div className="flex items-start justify-between mb-3 min-h-[32px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center space-x-1.5 text-sm font-medium text-blue-600">
            <TypeInfo.icon className="h-4 w-4" />
            <span>{TypeInfo.label}</span>
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getBadgeColor('difficulty', questionData.difficulty)}`}>{questionData.difficulty}</span>
          {questionData.category && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">{questionData.category}</span>}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`flex items-center space-x-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${getBadgeColor('status', questionData.status)}`}>
            {questionData.status === 'publish' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span>{questionData.status}</span>
          </span>
          {/* Botones de acción directos */}
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(question); }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(question); }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(question); }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Título - altura fija con truncate */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3 h-[28px] line-clamp-1 truncate" title={questionData.title}>
        {questionData.title}
      </h3>

      {/* Explicación - altura fija independientemente de si hay contenido */}
      <div className="mb-4 h-[40px]">
        {questionData.explanation ? (
          <p 
            className="text-sm text-gray-600 line-clamp-2 truncate" 
            dangerouslySetInnerHTML={{ __html: questionData.explanation }}
            title={questionData.explanation}
          />
        ) : (
          <div className="h-full" />
        )}
      </div>

      {/* Información adicional - altura fija */}
      <div className="space-y-3 pt-3 border-t border-gray-100 min-h-[80px]">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-1.5" title="Source">
            <ProviderInfo.icon className="h-4 w-4" />
            <span>{ProviderInfo.label}</span>
          </div>
          <div className="flex items-center space-x-1.5" title="Points">
            <Zap className="h-4 w-4 text-purple-500" />
            <span>{questionData.points} point{questionData.points !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="h-[20px]">
          {showQuiz && (associatedLesson || associatedQuiz) && (
            <div className="flex items-center space-x-1.5 text-sm text-gray-600">
              <BookOpen className="h-4 w-4" />
              <span className="truncate" title={associatedLesson?.title?.rendered || associatedQuiz?.title?.rendered}>
                {associatedLesson?.title?.rendered || associatedQuiz?.title?.rendered || 'Associated'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer - altura fija */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-4 h-[16px]">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{questionData.modifiedDate}</span>
        </div>
        <span>ID: {questionData.id}</span>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full gap-4">
      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <TypeInfo.icon className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate" title={questionData.title}>
            {questionData.title}
          </h3>
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getBadgeColor('difficulty', questionData.difficulty)}`}>
              {questionData.difficulty}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getBadgeColor('status', questionData.status)}`}>
              {questionData.status}
            </span>
            {/* Botones de acción en lista */}
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(question); }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit"
                >
                  <Edit className="h-3 w-3" />
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(question); }}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Duplicate"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(question); }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500 truncate">
          <div className="flex items-center space-x-1" title={ProviderInfo.label}>
            <ProviderInfo.icon className="h-4 w-4" />
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center space-x-1" title={`${questionData.points} points`}>
            <Zap className="h-4 w-4" />
            <span>{questionData.points}pt</span>
          </div>
          <span className="text-gray-300">|</span>
          {showQuiz && (associatedLesson || associatedQuiz) && (
            <div className="flex items-center space-x-1 truncate">
              <BookOpen className="h-4 w-4" />
              <span className="truncate" title={associatedLesson?.title?.rendered || associatedQuiz?.title?.rendered}>
                {associatedLesson?.title?.rendered || associatedQuiz?.title?.rendered}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card 
      item={question} 
      viewMode={viewMode} 
      actions={[]} 
      className={className} 
      clickable={!!onClick} 
      onClick={onClick}
    >
      {viewMode === 'cards' ? renderCardContent() : renderListContent()}
    </Card>
  );
};

export default QuestionCard;