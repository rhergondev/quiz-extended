import React from 'react';
import { render } from '@wordpress/element';
import './styles/index.css';

// --- Componente Principal de la Aplicación ---
const QuizExtendedApp = () => {
    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif'
        }}>
            <div className="bg-stone-100 min-h-screen flex items-center justify-center font-sans">
                <div className="bg-indigo-600 text-white p-8 rounded-lg shadow-lg">
                    <h1 className="text-3xl font-bold">¡Tailwind CSS está funcionando!</h1>
                    <p className="mt-2">Ahora puedes empezar a construir tu interfaz.</p>
                </div>
            </div>
        </div>
    );
};

// Renderizar la aplicación en el div target
const targetDiv = document.getElementById('quiz-extended-react-admin-app');
if (targetDiv) {
    render(<QuizExtendedApp />, targetDiv);
}