import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCourse from '../../../hooks/useCourse';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';

const CourseStatisticsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.statistics')}
    >
      <div className="qe-bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold qe-text-primary mb-4">
          {t('courses.statistics')}
        </h2>
        <p className="qe-text-secondary">
          {t('common.featureComingSoon')}
        </p>
      </div>
    </CoursePageTemplate>
  );
};

export default CourseStatisticsPage;
