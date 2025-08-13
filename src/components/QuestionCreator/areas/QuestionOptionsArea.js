import React from 'react';
import Card from '../../../shared/Card';
import AnswerOptionsSection from '../AnswerOptionsSection';
import { Save, Send, Trash2 } from '../../../shared/icons';

const QuestionOptionsArea = ({ 
    answers, 
    onAnswersChange, 
    questionType,
    onSave,
    onPublish,
    onDelete,
    isLoading 
}) => {
    return (
        <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Opciones de Respuesta */}
                <AnswerOptionsSection 
                    answers={answers}
                    onAnswersChange={onAnswersChange}
                    questionType={questionType}
                />
                
                {/* Botones de Acción */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e0e0e0'
                }}>
                    <button 
                        onClick={onDelete}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            border: '1px solid #dc3545',
                            backgroundColor: 'white',
                            color: '#dc3545',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <Trash2 size={16} />
                        Eliminar
                    </button>

                    <button 
                        onClick={onSave}
                        disabled={isLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            border: '1px solid #0969da',
                            backgroundColor: 'white',
                            color: '#0969da',
                            borderRadius: '6px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        <Save size={16} />
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </button>

                    <button 
                        onClick={onPublish}
                        disabled={isLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        <Send size={16} />
                        Publicar
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default QuestionOptionsArea;
