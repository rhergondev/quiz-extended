import React from 'react';
import { render } from '@wordpress/element';

const QuizExtendedApp = () => {
    return <h1>¡Hola Mundo desde mi plugin de React!</h1>;
};

// Buscamos el div que pusimos en nuestro shortcode o página de admin
const targetDiv = document.getElementById('quiz-extended-react');
if (targetDiv) {
    render(<QuizExtendedApp />, targetDiv);
}