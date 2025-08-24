import React, { useState, useEffect } from 'react';
import { render } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

// --- Componentes de UI reutilizables ---
const FormField = ({ label, children }) => <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{label}</label>{children}</div>;
const TextInput = (props) => <input type="text" {...props} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} />;
const Textarea = (props) => <textarea {...props} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', minHeight: '100px' }} />;
const Select = ({ children, ...props }) => <select {...props} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}>{children}</select>;
const Button = ({ children, ...props }) => <button {...props} style={{ padding: '10px 15px', border: 'none', backgroundColor: '#2271b1', color: 'white', borderRadius: '3px', cursor: 'pointer' }}>{children}</button>;

// --- Componente principal ---
const QuestionCreatorApp = () => {
    const { apiUrl, nonce } = window.quizExtendedData;

    // --- Estados del Componente ---
    const initialFormState = {
        question_title: '', question_description: '', question_type: 'multiple_choice', question_mark: 1,
        options: [{ answer_title: '', is_correct: false }, { answer_title: '', is_correct: false }],
        difficulty: 'medium', category: 'general', theme: 'default', approval_status: 'pending',
    };
    const [formData, setFormData] = useState(initialFormState);
    const [status, setStatus] = useState({ message: '', type: 'info' });
    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [testStatus, setTestStatus] = useState('Pendiente de prueba.'); // Estado para el test de conexión

    // --- Lógica para obtener las preguntas de nuestra API ---
    const fetchQuestions = () => {
        // Este endpoint aún necesita ser creado en el lado de PHP para que funcione.
        // apiFetch({ path: '/quiz-extended/v1/questions' })
        //     .then(data => setQuestions(data))
        //     .catch(error => console.error("Error fetching questions:", error));
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    // --- Manejadores de eventos ---
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleOptionChange = (index, value) => { const newOptions = [...formData.options]; newOptions[index].answer_title = value; setFormData(prev => ({ ...prev, options: newOptions })); };
    const handleCorrectChange = (index) => { const newOptions = formData.options.map((opt, i) => ({ ...opt, is_correct: i === index })); setFormData(prev => ({ ...prev, options: newOptions })); };
    const addOption = () => setFormData(prev => ({ ...prev, options: [...prev.options, { answer_title: '', is_correct: false }] }));

    const handleSubmit = () => {
        setIsLoading(true);
        setStatus({ message: 'Guardando pregunta...', type: 'info' });
        const payload = { ...formData, correct_answer: formData.options.find(opt => opt.is_correct)?.answer_title || '' };

        apiFetch({ path: '/quiz-extended/v1/questions', method: 'POST', data: payload, headers: { 'X-WP-Nonce': nonce } })
            .then(response => {
                if (response.success) {
                    setStatus({ message: response.message, type: 'success' });
                    setFormData(initialFormState);
                    fetchQuestions();
                } else { throw new Error(response.message || 'Ocurrió un error desconocido.'); }
            })
            .catch(error => setStatus({ message: `Error: ${error.message}`, type: 'error' }))
            .finally(() => setIsLoading(false));
    };

    // --- FUNCIÓN PARA PROBAR LA CONEXIÓN ---
    const handleTestConnection = () => {
        setTestStatus('Probando conexión con la API de Tutor...');
        apiFetch({ path: '/quiz-extended/v1/test-tutor-connection' })
            .then(response => {
                setTestStatus(`Respuesta: ${response.message} (Código: ${response.status_code})`);
                console.log('Respuesta del test:', response);
            })
            .catch(error => {
                setTestStatus(`Error en la conexión: ${error.message}`);
                console.error('Error en el test:', error);
            });
    };

    // --- Renderizado del Componente ---
    return (
        <div style={{ margin: '20px', fontFamily: 'sans-serif' }}>
            {/* Sección de Diagnóstico */}
            <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #e5e5e5', marginBottom: '20px' }}>
                <h3>Diagnóstico de Conexión</h3>
                <Button onClick={handleTestConnection}>Probar Conexión a Tutor API</Button>
                <p style={{ fontFamily: 'monospace', marginTop: '10px' }}><strong>Estado de la Conexión:</strong> {testStatus}</p>
            </div>

            {/* Formulario de Creación */}
            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 3, backgroundColor: 'white', padding: '20px', border: '1px solid #e5e5e5' }}>
                    <h2>Pregunta</h2>
                    <FormField label="Enunciado de la Pregunta *"><TextInput name="question_title" value={formData.question_title} onChange={handleChange} maxLength="200" /></FormField>
                    <FormField label="Opciones de Respuesta">{formData.options.map((opt, index) => (<div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}><input type="radio" name="correct_answer" checked={opt.is_correct} onChange={() => handleCorrectChange(index)} style={{ marginRight: '10px' }} /><TextInput value={opt.answer_title} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Opción ${String.fromCharCode(65 + index)}`} /></div>))}<button onClick={addOption} style={{ border: 'none', background: 'none', color: '#2271b1', cursor: 'pointer' }}>+ Añadir Opción</button></FormField>
                    <FormField label="Explicación / Retroalimentación (Opcional)"><Textarea name="question_description" value={formData.question_description} onChange={handleChange} maxLength="1000" /></FormField>
                </div>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', border: '1px solid #e5e5e5' }}>
                    <h3>Configuración</h3>
                    <FormField label="Dificultad:"><Select name="difficulty" value={formData.difficulty} onChange={handleChange}><option value="easy">Fácil</option><option value="medium">Media</option><option value="hard">Difícil</option></Select></FormField>
                    <FormField label="Categoría:"><Select name="category" value={formData.category} onChange={handleChange}><option value="history">Historia</option><option value="science">Ciencia</option></Select></FormField>
                    <FormField label="Tema:"><Select name="theme" value={formData.theme} onChange={handleChange}><option value="ww2">Segunda Guerra Mundial</option><option value="biology">Biología</option></Select></FormField>
                    <FormField label="Estado:"><Select name="approval_status" value={formData.approval_status} onChange={handleChange}><option value="pending">Pendiente</option><option value="approved">Aprobada</option></Select></FormField>
                </div>
            </div>
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'white', border: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {status.message && <p style={{ margin: 0, color: status.type === 'error' ? 'red' : 'green' }}>{status.message}</p>}
                <Button onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Pregunta'}</Button>
            </div>

            {/* Tabla de Preguntas */}
            <div style={{ marginTop: '40px' }}>
                <h2>Banco de Preguntas Guardadas</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #e5e5e5', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>ID Tutor (Simulado)</th>
                            <th style={{ padding: '10px' }}>Dificultad</th>
                            <th style={{ padding: '10px' }}>Categoría</th>
                            <th style={{ padding: '10px' }}>Tema</th>
                            <th style={{ padding: '10px' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.length > 0 ? (
                            questions.map(q => (
                                <tr key={q.meta_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px' }}>{q.tutor_question_id}</td>
                                    <td style={{ padding: '10px' }}>{q.difficulty}</td>
                                    <td style={{ padding: '10px' }}>{q.category}</td>
                                    <td style={{ padding: '10px' }}>{q.theme}</td>
                                    <td style={{ padding: '10px' }}>{q.approval_status}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No hay preguntas en el banco todavía.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const targetDiv = document.getElementById('quiz-extended-react-admin-app');
if (targetDiv) {
    render(<QuestionCreatorApp />, targetDiv);
}
