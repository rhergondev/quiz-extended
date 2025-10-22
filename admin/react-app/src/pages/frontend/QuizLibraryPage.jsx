import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Clock,
  BookCheck,
  Search,
  ChevronLeft
} from 'lucide-react';

// Hooks
import useCourses from '../../hooks/useCourses';
import useLessons from '../../hooks/useLessons';
import { useQuizzes } from '../../hooks/useQuizzes';

const QuizLibraryPage = () => {
  const navigate = useNavigate();
  const [expandedCourses, setExpandedCourses] = useState({});
  const [expandedLessons, setExpandedLessons] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data
  const { courses, loading: coursesLoading } = useCourses({ perPage: 100 });
  const { lessons, loading: lessonsLoading } = useLessons({ perPage: 100 });
  const { quizzes, loading: quizzesLoading } = useQuizzes({ perPage: 100 });

  console.log('📊 Data loaded:', { 
    courses: courses.length, 
    lessons: lessons.length, 
    quizzes: quizzes.length 
  });

  // Organizar quizzes por curso y lección
  const organizedQuizzes = useMemo(() => {
    if (!courses.length || !lessons.length || !quizzes.length) {
      console.log('⚠️ Missing data for organization');
      return [];
    }

    const structure = [];

    courses.forEach(course => {
      console.log(`📚 Processing course: ${course.title?.rendered || course.title}`);
      
      // Obtener lecciones del curso
      const courseLessons = lessons.filter(lesson => {
        const lessonCourses = lesson.meta?._course_ids || [];
        return lessonCourses.includes(course.id);
      });

      console.log(`  Found ${courseLessons.length} lessons for course ${course.id}`);

      if (courseLessons.length === 0) return;

      const courseData = {
        id: course.id,
        title: course.title?.rendered || course.title,
        lessons: []
      };

      courseLessons.forEach(lesson => {
        console.log(`  📄 Processing lesson: ${lesson.title?.rendered || lesson.title}`);
        
        // Obtener quizzes de la lección
        const lessonQuizzes = quizzes.filter(quiz => {
          const quizLessons = quiz.meta?._lesson_ids || [];
          const quizCourses = quiz.meta?._course_ids || [];
          
          // Check if quiz belongs to this lesson or course
          return quizLessons.includes(lesson.id) || 
                 (quizLessons.length === 0 && quizCourses.includes(course.id));
        });

        console.log(`    Found ${lessonQuizzes.length} quizzes for lesson ${lesson.id}`);

        if (lessonQuizzes.length === 0) return;

        courseData.lessons.push({
          id: lesson.id,
          title: lesson.title?.rendered || lesson.title,
          quizzes: lessonQuizzes.map(quiz => ({
            id: quiz.id,
            title: quiz.title?.rendered || quiz.title,
            questionCount: quiz.question_count || 0,
            timeLimit: quiz.time_limit || 0,
            passingScore: quiz.passing_score || 0
          }))
        });
      });

      if (courseData.lessons.length > 0) {
        structure.push(courseData);
      }
    });

    console.log('✅ Organization complete:', structure);
    return structure;
  }, [courses, lessons, quizzes]);

  // También mostrar quizzes sin asignar a curso/lección
  const unassignedQuizzes = useMemo(() => {
    if (!quizzes.length) return [];
    
    return quizzes.filter(quiz => {
      const quizLessons = quiz.meta?._lesson_ids || [];
      const quizCourses = quiz.meta?._course_ids || [];
      return quizLessons.length === 0 && quizCourses.length === 0;
    }).map(quiz => ({
      id: quiz.id,
      title: quiz.title?.rendered || quiz.title,
      questionCount: quiz.question_count || 0,
      timeLimit: quiz.time_limit || 0,
      passingScore: quiz.passing_score || 0
    }));
  }, [quizzes]);

  // Filtrar por búsqueda
  const filteredStructure = useMemo(() => {
    if (!searchTerm) return organizedQuizzes;

    return organizedQuizzes.map(course => ({
      ...course,
      lessons: course.lessons.map(lesson => ({
        ...lesson,
        quizzes: lesson.quizzes.filter(quiz =>
          quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(lesson => lesson.quizzes.length > 0)
    })).filter(course => course.lessons.length > 0);
  }, [organizedQuizzes, searchTerm]);

  const filteredUnassigned = useMemo(() => {
    if (!searchTerm) return unassignedQuizzes;
    return unassignedQuizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unassignedQuizzes, searchTerm]);

  const toggleCourse = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const toggleLesson = (lessonId) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  const handleQuizClick = (quizId) => {
    navigate(`/quiz/${quizId}`);
  };

  const loading = coursesLoading || lessonsLoading || quizzesLoading;

  const totalQuizzes = organizedQuizzes.reduce((total, course) => 
    total + course.lessons.reduce((lessonTotal, lesson) => 
      lessonTotal + lesson.quizzes.length, 0
    ), 0
  ) + unassignedQuizzes.length;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/test')}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Volver a Test
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Biblioteca de Cuestionarios</h1>
          <p className="text-gray-600 mt-2">
            Accede a todos los cuestionarios disponibles organizados por curso y lección
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Search Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Todos los Cuestionarios</h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    {loading ? 'Cargando...' : `${totalQuizzes} cuestionarios disponibles`}
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
              <input
                type="text"
                placeholder="Buscar cuestionario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                <span className="text-gray-600">Cargando cuestionarios...</span>
              </div>
            ) : filteredStructure.length === 0 && filteredUnassigned.length === 0 ? (
              <div className="text-center py-12">
                <BookCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {searchTerm ? 'No se encontraron cuestionarios' : 'No hay cuestionarios disponibles'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Los cuestionarios aparecerán aquí cuando estén disponibles'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Organized Quizzes */}
                {filteredStructure.length > 0 && (
                  <div className="space-y-4">
                    {filteredStructure.map(course => (
                      <div key={course.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Course Header */}
                        <button
                          onClick={() => toggleCourse(course.id)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {expandedCourses[course.id] ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            <span className="font-semibold text-gray-800">{course.title}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {course.lessons.reduce((total, lesson) => total + lesson.quizzes.length, 0)} cuestionarios
                          </span>
                        </button>

                        {/* Lessons */}
                        {expandedCourses[course.id] && (
                          <div className="bg-white">
                            {course.lessons.map(lesson => (
                              <div key={lesson.id} className="border-t border-gray-200">
                                {/* Lesson Header */}
                                <button
                                  onClick={() => toggleLesson(lesson.id)}
                                  className="w-full flex items-center justify-between p-4 pl-12 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    {expandedLessons[lesson.id] ? (
                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-500" />
                                    )}
                                    <FileText className="w-4 h-4 text-purple-600" />
                                    <span className="text-gray-700 font-medium">{lesson.title}</span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {lesson.quizzes.length} cuestionarios
                                  </span>
                                </button>

                                {/* Quizzes */}
                                {expandedLessons[lesson.id] && (
                                  <div className="bg-gray-50 border-t border-gray-200">
                                    {lesson.quizzes.map(quiz => (
                                      <button
                                        key={quiz.id}
                                        onClick={() => handleQuizClick(quiz.id)}
                                        className="w-full flex items-center justify-between p-4 pl-20 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                                      >
                                        <div className="flex items-center space-x-3 flex-1">
                                          <BookCheck className="w-4 h-4 text-green-600" />
                                          <span className="text-gray-800 text-sm">{quiz.title}</span>
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                          <div className="flex items-center space-x-1">
                                            <FileText className="w-3 h-3" />
                                            <span>{quiz.questionCount} preguntas</span>
                                          </div>
                                          {quiz.timeLimit > 0 && (
                                            <div className="flex items-center space-x-1">
                                              <Clock className="w-3 h-3" />
                                              <span>{quiz.timeLimit} min</span>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Unassigned Quizzes */}
                {filteredUnassigned.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-800">Otros Cuestionarios</span>
                        <span className="text-sm text-gray-500">
                          ({filteredUnassigned.length})
                        </span>
                      </div>
                    </div>
                    <div className="bg-white">
                      {filteredUnassigned.map(quiz => (
                        <button
                          key={quiz.id}
                          onClick={() => handleQuizClick(quiz.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <BookCheck className="w-4 h-4 text-green-600" />
                            <span className="text-gray-800 text-sm">{quiz.title}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <FileText className="w-3 h-3" />
                              <span>{quiz.questionCount} preguntas</span>
                            </div>
                            {quiz.timeLimit > 0 && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{quiz.timeLimit} min</span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizLibraryPage;
