import React from 'react';
import { render } from '@wordpress/element';
import './styles/index.css';

// Importar componentes
import DashboardApp from './components/apps/DashboardApp';
import QuestionsApp from './components/apps/QuestionsApp';

// --- Detectar en qué página estamos y renderizar el componente apropiado ---
const targetDivDashboard = document.getElementById('quiz-extended-react-admin-app');
const targetDivQuestions = document.getElementById('quiz-extended-questions-app');

if (targetDivDashboard) {
    render(<DashboardApp />, targetDivDashboard);
}

if (targetDivQuestions) {
    render(<QuestionsApp />, targetDivQuestions);
}