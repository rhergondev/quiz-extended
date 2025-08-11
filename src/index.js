import React, { useState } from 'react';
import { render } from '@wordpress/element';

// --- Componente de Campo de Formulario Reutilizable ---
// Para no repetir el mismo código de label e input una y otra vez.
const FormField = ({ label, children, htmlFor }) => (
    <div style={{ marginBottom: '15px' }}>
        <label htmlFor={htmlFor} style={{ fontWeight: '600', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            {label}
        </label>
        {children}
    </div>
);

// --- Componente Principal de la Aplicación ---
const AdvancedCourseCreator = () => {
    // --- Credenciales y Datos Iniciales ---
    const tutorApiKey = 'key_e6c6f22ea04bf8f1b2618a86067e6345';
    const tutorSecretKey = 'secret_2cb92b66c737d6a6bd96ec6e797691eaba149009cdab8d653b2a0528ee1b321d';
    const { author_id } = window.quizExtendedData;
    const authHeader = 'Basic ' + btoa(`${tutorApiKey}:${tutorSecretKey}`);

    // --- Estado del Formulario ---
    // Usamos un solo objeto para el estado, lo que facilita su gestión.
    const initialCourseData = {
        post_title: '',
        post_content: '',
        post_excerpt: '',
        course_level: 'beginner',
        course_benefits: '',
        duration_hours: '1',
        duration_minutes: '30',
    };

    const [courseData, setCourseData] = useState(initialCourseData);
    const [status, setStatus] = useState({ message: 'Rellena los campos para crear un nuevo curso.', type: 'info' });
    const [isLoading, setIsLoading] = useState(false);

    // --- Manejadores de Eventos ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCourseData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleCreateCourse = () => {
        if (!courseData.post_title) {
            setStatus({ message: 'El título del curso es obligatorio.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setStatus({ message: 'Creando curso, por favor espera...', type: 'info' });

        // Construimos el cuerpo de la petición según la API de Tutor
        const apiRequestBody = {
            post_author: author_id,
            post_title: courseData.post_title,
            post_content: courseData.post_content,
            post_excerpt: courseData.post_excerpt,
            post_status: 'publish',
            course_level: courseData.course_level,
            additional_content: {
                course_benefits: courseData.course_benefits,
                course_duration: {
                    hours: courseData.duration_hours,
                    minutes: courseData.duration_minutes,
                },
            },
        };

        // Petición a la API
        fetch('http://localhost:8000/wp-json/tutor/v1/courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(apiRequestBody),
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                // Si la respuesta no es OK, lanzamos un error con el mensaje de la API
                throw new Error(data.message || `Error HTTP ${response.status}`);
            }
            return data;
        })
        .then(data => {
            setStatus({ message: `✅ ¡Éxito! Curso "${data.post_title}" creado con ID: ${data.ID}`, type: 'success' });
            setCourseData(initialCourseData); // Reseteamos el formulario
        })
        .catch(error => {
            setStatus({ message: `❌ Fallo: ${error.message}`, type: 'error' });
            console.error("Detalles del error:", error);
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    // --- Renderizado del Componente ---
    return (
        <div style={{ padding: '20px', margin: '20px', backgroundColor: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: '4px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif' }}>
            <h1 style={{ fontSize: '23px', fontWeight: '400', margin: '0 0 20px' }}>Creador de Cursos Personalizado</h1>
            
            <div style={{ backgroundColor: 'white', padding: '20px', border: '1px solid #c3c4c7' }}>
                <FormField label="Título del Curso" htmlFor="post_title">
                    <input
                        type="text"
                        id="post_title"
                        name="post_title"
                        value={courseData.post_title}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </FormField>

                <FormField label="Descripción Principal" htmlFor="post_content">
                    <textarea
                        id="post_content"
                        name="post_content"
                        value={courseData.post_content}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', minHeight: '120px' }}
                    />
                </FormField>

                <FormField label="Resumen (Descripción Corta)" htmlFor="post_excerpt">
                    <textarea
                        id="post_excerpt"
                        name="post_excerpt"
                        value={courseData.post_excerpt}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', minHeight: '60px' }}
                    />
                </FormField>

                <FormField label="Beneficios del Curso" htmlFor="course_benefits">
                    <input
                        type="text"
                        id="course_benefits"
                        name="course_benefits"
                        value={courseData.course_benefits}
                        onChange={handleChange}
                        placeholder="Ej: Aprenderás X, Y y Z"
                        style={{ width: '100%', padding: '8px' }}
                    />
                </FormField>

                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <FormField label="Nivel" htmlFor="course_level">
                            <select id="course_level" name="course_level" value={courseData.course_level} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                                <option value="beginner">Principiante</option>
                                <option value="intermediate">Intermedio</option>
                                <option value="expert">Experto</option>
                            </select>
                        </FormField>
                    </div>
                    <div style={{ flex: 1 }}>
                        <FormField label="Horas" htmlFor="duration_hours">
                            <input type="number" id="duration_hours" name="duration_hours" value={courseData.duration_hours} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                        </FormField>
                    </div>
                    <div style={{ flex: 1 }}>
                        <FormField label="Minutos" htmlFor="duration_minutes">
                            <input type="number" id="duration_minutes" name="duration_minutes" value={courseData.duration_minutes} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                        </FormField>
                    </div>
                </div>

                <button
                    onClick={handleCreateCourse}
                    disabled={isLoading}
                    style={{ marginTop: '10px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#2271b1', color: 'white', border: 'none', borderRadius: '3px' }}
                >
                    {isLoading ? 'Creando...' : 'Crear Curso'}
                </button>

                {status.message && (
                    <p style={{ 
                        marginTop: '20px', 
                        padding: '10px', 
                        borderLeft: `4px solid ${status.type === 'success' ? '#4CAF50' : status.type === 'error' ? '#F44336' : '#2196F3'}`,
                        backgroundColor: '#f8f8f8'
                    }}>
                        {status.message}
                    </p>
                )}
            </div>
        </div>
    );
};

const targetDiv = document.getElementById('quiz-extended-react-admin-app');
if (targetDiv) {
    render(<AdvancedCourseCreator />, targetDiv);
}