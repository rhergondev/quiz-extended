import React, { useState } from 'react';
import Button from '../common/Button';

const ApiTestApp = () => {
    const [testResults, setTestResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quizzes, setQuizzes] = useState(null);
    const [createResult, setCreateResult] = useState(null);
    const [specificQuizTest, setSpecificQuizTest] = useState(null);

    // API Keys hardcodeadas (temporal)
    const API_KEY = 'key_157c7efa23575e8e68e7e81740592224';
    const API_SECRET = 'secret_fa666f1cbeefa1b814bb599f1f59f1476fc38b0cf95f26dd75d98239d334436e';
    const BASE_URL = 'http://localhost:8000/wp-json/tutor/v1/';
    const TEST_QUIZ_ID = 16; // Quiz específico para tests

    const authHeader = 'Basic ' + btoa(`${API_KEY}:${API_SECRET}`);

    // Test de conectividad básica
    const testConnectivity = async () => {
        setIsLoading(true);
        setTestResults(null);

        try {
            const response = await fetch(`${BASE_URL}courses?order=&orderby=&paged=1`, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const result = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: `${BASE_URL}courses`,
                timestamp: new Date().toISOString()
            };

            if (response.ok) {
                const data = await response.json();
                result.data = data;
                result.dataCount = Array.isArray(data) ? data.length : 'No es array';
            } else {
                const errorText = await response.text();
                result.error = errorText;
            }

            setTestResults(result);

        } catch (error) {
            setTestResults({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Obtener quizzes
    const getQuizzes = async () => {
        setIsLoading(true);
        setQuizzes(null);

        try {
            const response = await fetch(`${BASE_URL}quizzes`, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setQuizzes({
                    success: true,
                    count: Array.isArray(data) ? data.length : 0,
                    data: data,
                    message: `Encontrados ${Array.isArray(data) ? data.length : 0} quizzes`
                });
            } else {
                const errorText = await response.text();
                setQuizzes({
                    success: false,
                    error: errorText,
                    status: response.status
                });
            }

        } catch (error) {
            setQuizzes({
                success: false,
                error: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Test específico del quiz ID 25
    const testSpecificQuiz = async () => {
        setIsLoading(true);
        setSpecificQuizTest(null);

        try {
            const response = await fetch(`${BASE_URL}quizzes/${TEST_QUIZ_ID}`, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const result = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: `${BASE_URL}quizzes/${TEST_QUIZ_ID}`,
                quizId: TEST_QUIZ_ID
            };

            if (response.ok) {
                const data = await response.json();
                result.data = data;
                result.message = `Quiz ID ${TEST_QUIZ_ID} encontrado: ${data.post_title || data.title || 'Sin título'}`;
            } else {
                const errorText = await response.text();
                result.error = errorText;
                result.message = `Error obteniendo quiz ID ${TEST_QUIZ_ID}`;
            }

            setSpecificQuizTest(result);

        } catch (error) {
            setSpecificQuizTest({
                success: false,
                error: error.message,
                quizId: TEST_QUIZ_ID,
                message: `Error de conexión al obtener quiz ID ${TEST_QUIZ_ID}`
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Crear pregunta de prueba usando el quiz ID 25
   const createTestQuestion = async () => {
    setIsLoading(true);
    setCreateResult(null);

    // Puedes cambiar el tipo de pregunta para probar otros formatos
    const questionType = 'multiple_choice'; // Cambia a 'single_choice', 'true_false', etc. para otros tests

    // Datos según la documentación oficial
    let questionData = {
        quiz_id: TEST_QUIZ_ID,
        question_title: `Pregunta API Test - ${new Date().toLocaleTimeString()}`,
        question_type: questionType,
        answer_required: 1,
        randomize_question: 1,
        question_mark: 1,
        show_question_mark: 1,
        answer_explanation: 'Esta es una pregunta de prueba creada desde React usando la API oficial de Tutor LMS',
        question_description: 'Descripción detallada de la pregunta de prueba para validar la funcionalidad completa de la API'
    };

    // Añadir campos específicos según el tipo de pregunta
    if (questionType === 'multiple_choice') {
        questionData.options = ["MySQL", "Mongo DB", "PostgreSQL"];
        questionData.correct_answer = ["MySQL", "PostgreSQL"];
    } else if (questionType === 'single_choice') {
        questionData.options = ["MySQL", "Mongo DB", "PostgreSQL"];
        questionData.correct_answer = "Mongo DB";
    } else if (questionType === 'true_false') {
        questionData.correct_answer = "true";
    } else if (questionType === 'fill_in_the_blank') {
        questionData.question = "Dhaka city has a {dash} population. It is well known for its diverse {dash} & bustling {dash}.";
        questionData.correct_answer = "large|cuisine|commerce";
    } else if (questionType === 'short_answer') {
        // No extra fields needed
    } else if (questionType === 'open_ended') {
        questionData.question_mark = 2;
    } else if (questionType === 'matching') {
        questionData.matching_options = {
            left: ["HTML", "Python", "CSS", "SQL"],
            right: ["Styling", "Database", "Markup", "Scripting"]
        };
        questionData.correct_answer = {
            "HTML": "Markup",
            "Python": "Scripting",
            "CSS": "Styling",
            "SQL": "Database"
        };
        questionData.question_mark = 2;
    }

    try {
        console.log('📤 Enviando datos:', questionData);

        const response = await fetch(`${BASE_URL}quiz-questions`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(questionData)
        });

        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            url: `${BASE_URL}quiz-questions`,
            sentData: questionData,
            quizUsed: {
                id: TEST_QUIZ_ID,
                title: `Quiz ID ${TEST_QUIZ_ID}`
            },
            timestamp: new Date().toISOString()
        };

        if (response.ok) {
            const data = await response.json();
            result.responseData = data;
            result.message = `✅ Pregunta creada exitosamente en Quiz ID ${TEST_QUIZ_ID}`;
            if (data.question_id || data.id || data.ID) {
                result.createdQuestionId = data.question_id || data.id || data.ID;
            }
        } else {
            const errorText = await response.text();
            result.error = errorText;
            result.message = `❌ Error creando pregunta en Quiz ID ${TEST_QUIZ_ID}`;
            try {
                const errorJson = JSON.parse(errorText);
                result.errorDetails = errorJson;
            } catch (e) {
                result.errorRaw = errorText;
            }
        }

        setCreateResult(result);

    } catch (error) {
        setCreateResult({
            success: false,
            error: error.message,
            sentData: questionData,
            message: `❌ Error de conexión al crear pregunta`,
            timestamp: new Date().toISOString()
        });
    } finally {
        setIsLoading(false);
    }
};

    return (
        <div className="min-h-screen bg-gray-100 font-sans p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        🧪 Test de API de Tutor LMS
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Herramienta completa para probar la conectividad y funcionalidad de la API de Tutor LMS. 
                        Usando quiz específico ID <strong>{TEST_QUIZ_ID}</strong> para tests controlados.
                    </p>

                    {/* Información de configuración */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-800 mb-2">Configuración Actual</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <strong>Base URL:</strong> {BASE_URL}
                            </div>
                            <div>
                                <strong>API Key:</strong> {API_KEY.substring(0, 20)}...
                            </div>
                            <div>
                                <strong>Auth:</strong> Basic Authentication
                            </div>
                            <div>
                                <strong>Quiz Test ID:</strong> {TEST_QUIZ_ID}
                            </div>
                            <div>
                                <strong>Estado:</strong> {isLoading ? '🔄 Cargando...' : '✅ Listo'}
                            </div>
                            <div>
                                <strong>Endpoint Questions:</strong> /quiz-questions
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Button 
                            onClick={testConnectivity}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? 'Probando...' : '🔗 Test Conectividad'}
                        </Button>

                        <Button 
                            onClick={getQuizzes}
                            disabled={isLoading}
                            className="w-full"
                            variant="secondary"
                        >
                            {isLoading ? 'Obteniendo...' : '📚 Obtener Quizzes'}
                        </Button>

                        <Button 
                            onClick={testSpecificQuiz}
                            disabled={isLoading}
                            className="w-full"
                            variant="secondary"
                        >
                            {isLoading ? 'Probando...' : `🎯 Test Quiz ${TEST_QUIZ_ID}`}
                        </Button>

                        <Button 
                            onClick={createTestQuestion}
                            disabled={isLoading}
                            className="w-full"
                            variant="danger"
                        >
                            {isLoading ? 'Creando...' : '📝 Crear Pregunta'}
                        </Button>
                    </div>

                    {/* Resultados */}
                    <div className="space-y-6">
                        {/* Resultado de conectividad */}
                        {testResults && (
                            <div className={`border rounded-lg p-4 ${testResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h3 className={`font-semibold mb-3 ${testResults.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {testResults.success ? '✅ Test de Conectividad - EXITOSO' : '❌ Test de Conectividad - FALLIDO'}
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                    <div><strong>Status:</strong> {testResults.status} {testResults.statusText}</div>
                                    <div><strong>Timestamp:</strong> {testResults.timestamp}</div>
                                    <div><strong>URL:</strong> {testResults.url}</div>
                                    {testResults.dataCount && <div><strong>Cursos encontrados:</strong> {testResults.dataCount}</div>}
                                </div>

                                {testResults.error && (
                                    <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                                        <strong>Error:</strong> {testResults.error}
                                    </div>
                                )}

                                {testResults.data && (
                                    <details className="bg-white border rounded p-3">
                                        <summary className="cursor-pointer font-medium">Ver datos de respuesta...</summary>
                                        <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded max-h-40">
                                            {JSON.stringify(testResults.data, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Resultado de test específico del quiz */}
                        {specificQuizTest && (
                            <div className={`border rounded-lg p-4 ${specificQuizTest.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h3 className={`font-semibold mb-3 ${specificQuizTest.success ? 'text-green-800' : 'text-red-800'}`}>
                                    🎯 Test Quiz ID {TEST_QUIZ_ID} - {specificQuizTest.success ? 'ENCONTRADO' : 'ERROR'}
                                </h3>
                                
                                <p className="mb-4">{specificQuizTest.message}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                    <div><strong>Status:</strong> {specificQuizTest.status} {specificQuizTest.statusText}</div>
                                    <div><strong>URL:</strong> {specificQuizTest.url}</div>
                                </div>

                                {specificQuizTest.error && (
                                    <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                                        <strong>Error:</strong> {specificQuizTest.error}
                                    </div>
                                )}

                                {specificQuizTest.data && (
                                    <details className="bg-white border rounded p-3">
                                        <summary className="cursor-pointer font-medium">Ver datos del quiz...</summary>
                                        <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded max-h-40">
                                            {JSON.stringify(specificQuizTest.data, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Resultado de quizzes */}
                        {quizzes && (
                            <div className={`border rounded-lg p-4 ${quizzes.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h3 className={`font-semibold mb-3 ${quizzes.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {quizzes.success ? '✅ Quizzes - ENCONTRADOS' : '❌ Quizzes - ERROR'}
                                </h3>
                                
                                <p className="mb-4">{quizzes.message || quizzes.error}</p>

                                {quizzes.success && quizzes.data && (
                                    <details className="bg-white border rounded p-3">
                                        <summary className="cursor-pointer font-medium">Ver quizzes encontrados...</summary>
                                        <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded max-h-64">
                                            {JSON.stringify(quizzes.data, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Resultado de creación de pregunta */}
                        {createResult && (
                            <div className={`border rounded-lg p-4 ${createResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h3 className={`font-semibold mb-3 ${createResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {createResult.success ? '✅ Pregunta Creada - EXITOSO' : '❌ Crear Pregunta - FALLIDO'}
                                </h3>
                                
                                <p className="mb-4">{createResult.message}</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                                    <div><strong>Status:</strong> {createResult.status} {createResult.statusText}</div>
                                    <div><strong>Quiz usado:</strong> {createResult.quizUsed?.title} (ID: {createResult.quizUsed?.id})</div>
                                    <div><strong>Timestamp:</strong> {createResult.timestamp}</div>
                                    {createResult.createdQuestionId && (
                                        <div><strong>ID Pregunta creada:</strong> {createResult.createdQuestionId}</div>
                                    )}
                                </div>

                                {createResult.error && (
                                    <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                                        <strong>Error:</strong> {createResult.error}
                                    </div>
                                )}

                                {createResult.errorDetails && (
                                    <details className="bg-red-50 border rounded p-3 mb-3">
                                        <summary className="cursor-pointer font-medium">Ver detalles del error...</summary>
                                        <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded">
                                            {JSON.stringify(createResult.errorDetails, null, 2)}
                                        </pre>
                                    </details>
                                )}

                                <details className="bg-white border rounded p-3 mb-3">
                                    <summary className="cursor-pointer font-medium">Ver datos enviados...</summary>
                                    <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded max-h-40">
                                        {JSON.stringify(createResult.sentData, null, 2)}
                                    </pre>
                                </details>

                                {createResult.responseData && (
                                    <details className="bg-white border rounded p-3">
                                        <summary className="cursor-pointer font-medium">Ver respuesta de la API...</summary>
                                        <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded max-h-40">
                                            {JSON.stringify(createResult.responseData, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiTestApp;