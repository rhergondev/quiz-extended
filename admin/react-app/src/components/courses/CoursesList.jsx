import React from 'react';
import Table from '../common/Table';
import Button from '../common/Button';

/**
 * Muestra una tabla con la lista de cursos.
 *
 * @param {object} props
 * @param {Array<object>} props.courses - La lista de cursos a mostrar.
 * @param {boolean} props.isLoading - Si es true, la tabla mostrará un estado de carga.
 * @param {function(id): void} props.onDelete - Función a llamar cuando se hace clic en borrar.
 * @param {function(id): void} props.onEdit - Función a llamar cuando se hace clic en editar.
 */
const CoursesList = ({ courses, isLoading, onDelete, onEdit }) => {
  // 1. Definimos la estructura de las columnas para nuestra tabla de cursos.
  const columns = [
    {
      key: 'title',
      header: 'Title',
      // Usamos una función de renderizado para darle un estilo especial al título.
      render: (course) => (
        <span className="font-semibold text-gray-800">
          {/* La API de WordPress devuelve el título dentro de un objeto 'rendered' */}
          {course.title.rendered || 'No Title'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      // Hacemos el status más visual con un "badge" de color.
      render: (course) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            course.status === 'publish'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {course.status}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Published Date',
      // Formateamos la fecha para que sea más legible.
      render: (course) => new Date(course.date).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      // Usamos una función de renderizado para crear los botones de acción.
      render: (course) => (
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={() => onEdit(course.id)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => onDelete(course.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // 2. Renderizamos el componente Table, pasándole la configuración y los datos.
  return <Table columns={columns} data={courses} isLoading={isLoading} />;
};

export default CoursesList;