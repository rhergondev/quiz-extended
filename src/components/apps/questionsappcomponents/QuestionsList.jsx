import React, { useState } from 'react';
import Button from '../../common/Button';

const QuestionsList = ({ onAddQuestion, onEditQuestion }) => {
    // Estado temporal para preguntas de ejemplo
    const [questions] = useState([
        {
            id: 1,
            title: "¿Cuál es la capital de Francia?",
            type: "Opción Múltiple",
            difficulty: "Fácil",
            category: "Geografía",
            status: "Publicado"
        },
        {
            id: 2,
            title: "¿Quién escribió 'Don Quijote'?",
            type: "Opción Múltiple", 
            difficulty: "Media",
            category: "Literatura",
            status: "Borrador"
        },
        {
            id: 3,
            title: "¿Cuántos planetas hay en el sistema solar?",
            type: "Opción Múltiple",
            difficulty: "Fácil",
            category: "Ciencia",
            status: "Publicado"
        }
    ]);

    return (
        <div className="bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Questions</h1>
                        <p className="text-gray-600 mt-2">
                            Gestiona todas las preguntas de tus cuestionarios
                        </p>
                    </div>
                    <Button 
                        onClick={onAddQuestion}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Add Question
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-4">
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option>Todas las categorías</option>
                        <option>Geografía</option>
                        <option>Literatura</option>
                        <option>Ciencia</option>
                    </select>
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option>Todas las dificultades</option>
                        <option>Fácil</option>
                        <option>Media</option>
                        <option>Difícil</option>
                    </select>
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option>Todos los estados</option>
                        <option>Publicado</option>
                        <option>Borrador</option>
                        <option>Archivado</option>
                    </select>
                </div>
            </div>

            {/* Lista de preguntas */}
            <div className="p-6">
                {questions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">📝</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay preguntas todavía
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Comienza creando tu primera pregunta
                        </p>
                        <Button onClick={onAddQuestion}>
                            Crear Primera Pregunta
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Pregunta
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Dificultad
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Categoría
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {questions.map((question) => (
                                    <tr key={question.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {question.title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {question.type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                question.difficulty === 'Fácil' ? 'bg-green-100 text-green-800' :
                                                question.difficulty === 'Media' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {question.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {question.category}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                question.status === 'Publicado' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {question.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => onEditQuestion(question.id)}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            <button className="text-red-600 hover:text-red-900">
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionsList;
