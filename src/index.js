import React from 'react';
import { render } from '@wordpress/element';

const QuizExtendedApp = () => {
    return (
        <div style={{ padding: '20px', margin: '20px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <h1>¡Esta es mi App de React en el Admin de WordPress! 🚀</h1>
            <p>Este es el punto de partida para construir el nuevo creador de cuestionarios.</p>
        </div>
    );
};

// Buscamos el div que pusimos en nuestro shortcode o página de admin
const targetDiv = document.getElementById('quiz-extended-react-admin-app');
if (targetDiv) {
    render(<QuizExtendedApp />, targetDiv);
}