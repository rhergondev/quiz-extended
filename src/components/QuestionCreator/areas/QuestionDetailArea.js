import React from 'react';
import Card from '../../../shared/Card';
import FormField from '../../../shared/FormField';
import Textarea from '../../../shared/Textarea';

const QuestionDetailArea = ({ questionData, onQuestionChange, comments, onCommentsChange }) => {
    const handleChange = (field, value) => {
        onQuestionChange({ ...questionData, [field]: value });
    };

    return (
        <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Información Básica de la Pregunta */}
                <div>
                    <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        margin: '0 0 16px', 
                        color: '#1a1a1a' 
                    }}>
                        Detalles de la Pregunta
                    </h3>
                    
                    <FormField 
                        label="Texto de la Pregunta" 
                        htmlFor="question-text"
                        required
                    >
                        <Textarea
                            value={questionData.question || ''}
                            onChange={(e) => handleChange('question', e.target.value)}
                            placeholder="Escribe tu pregunta aquí..."
                            minHeight="100px"
                        />
                    </FormField>
                </div>

                {/* Comentarios Adicionales */}
                <div>
                    <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        margin: '0 0 16px', 
                        color: '#1a1a1a' 
                    }}>
                        Comentarios Adicionales
                    </h3>
                    
                    <FormField 
                        label="Instrucciones o contexto adicional"
                        htmlFor="comments"
                        help="Agrega cualquier información que pueda ayudar a entender mejor la pregunta"
                    >
                        <Textarea
                            value={comments || ''}
                            onChange={(e) => onCommentsChange(e.target.value)}
                            placeholder="Contexto, instrucciones especiales, referencias..."
                            minHeight="80px"
                        />
                    </FormField>
                </div>
            </div>
        </Card>
    );
};

export default QuestionDetailArea;
