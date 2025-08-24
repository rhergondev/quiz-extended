import React, { useState } from 'react';
import QuestionEditor from './questionsappcomponents/QuestionEditor';
import QuestionsList from './questionsappcomponents/QuestionsList';

const QuestionsApp = () => {
    const [currentView, setCurrentView] = useState('list'); // 'list' o 'editor'
    const [editingQuestion, setEditingQuestion] = useState(null);

    const handleAddQuestion = () => {
        setEditingQuestion(null); // Nueva pregunta
        setCurrentView('editor');
    };

    const handleEditQuestion = (questionId) => {
        setEditingQuestion(questionId);
        setCurrentView('editor');
    };

    const handleBackToList = () => {
        setCurrentView('list');
        setEditingQuestion(null);
    };

    if (currentView === 'editor') {
        return (
            <div className="w-full min-h-screen bg-gray-100 font-sans p-8 h-screen">
                <QuestionEditor 
                    questionId={editingQuestion}
                    onBack={handleBackToList}
                />
            </div>
        );
    }

    // Vista de lista de preguntas
    return (
        <div className="min-h-screen bg-gray-100 font-sans p-8">
            <QuestionsList 
                onAddQuestion={handleAddQuestion}
                onEditQuestion={handleEditQuestion}
            />
        </div>
    );
};

export default QuestionsApp;