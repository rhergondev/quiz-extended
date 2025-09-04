import React from 'react';
import LessonsManager from '../components/lessons/LessonsManager.jsx';

const LessonsPage = () => {
  return (
    <div className="wrap">
      <LessonsManager 
        showCourseSelection={true}
        title="Lesson Management"
      />
    </div>
  );
};

export default LessonsPage;