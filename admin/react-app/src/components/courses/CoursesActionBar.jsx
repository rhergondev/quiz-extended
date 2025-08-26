import React from 'react';
import Button from '../common/Button';

/**
 * Muestra la barra de acciones para la página de Cursos.
 *
 * @param {object} props
 * @param {function(): void} props.onNewCourse - Función a llamar cuando se hace clic en "New Course".
 */
const CoursesActionBar = ({ onNewCourse }) => {
  return (
    <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
      <div>
        {/* Aquí podríamos añadir un título o filtros en el futuro */}
        <h2 className="text-xl font-semibold text-gray-800">Courses</h2>
      </div>
      <div>
        <Button onClick={onNewCourse} variant="primary">
          New Course
        </Button>
      </div>
    </div>
  );
};

export default CoursesActionBar;