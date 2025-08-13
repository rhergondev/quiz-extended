import React from 'react';
import { render } from '@wordpress/element';
import './styles/index.css';

// Importas el único componente que necesitas
import QuestionEditor from './components/question-editor/QuestionEditor';

const QuizExtendedApp = () => {
    return (
        <div className="min-h-screen bg-gray-100 font-sans p-8">
            <QuestionEditor />
        </div>
    );
};

const targetDiv = document.getElementById('quiz-extended-react-admin-app');
if (targetDiv) {
    render(<QuizExtendedApp />, targetDiv);
}