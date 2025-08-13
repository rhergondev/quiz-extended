import React from 'react';
import Card from '../../../shared/Card';
import Grid from '../../../shared/Grid';
import StatusControl from '../../controls/StatusControl';
import DifficultyControl from '../../controls/DifficultyControl';
import ScoringControl from '../../controls/ScoringControl';
import ClassificationControl from '../../controls/ClassificationControl';

const QuestionMetaArea = ({ 
    statusData, 
    onStatusChange,
    difficultyData, 
    onDifficultyChange,
    answers,
    classificationData, 
    onClassificationChange 
}) => {
    return (
        <Card padding="20px" style={{ marginBottom: '20px' }}>
            <Grid columns="1fr 1fr 1fr 1fr" gap="20px">
                <StatusControl 
                    statusData={statusData}
                    onStatusChange={onStatusChange}
                />

                <DifficultyControl 
                    difficultyData={difficultyData}
                    onDifficultyChange={onDifficultyChange}
                />

                <ScoringControl 
                    answers={answers}
                />

                <ClassificationControl 
                    classificationData={classificationData}
                    onClassificationChange={onClassificationChange}
                />
            </Grid>
        </Card>
    );
};

export default QuestionMetaArea;
