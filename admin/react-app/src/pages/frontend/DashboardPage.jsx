// src/pages/DashboardPage.jsx

import React from 'react';
import QuizResultsSummary from '../../components/frontend/dashboard/QuizResultsSummary';

const DashboardPage = () => {
  // Aquí podrías obtener el nombre del usuario, etc.
  const userName = "Estudiante"; 

  return (
    <div className="container mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido de nuevo, {userName}!</h1>
        <p className="mt-2 text-lg text-gray-600">Aquí tienes un resumen de tu progreso.</p>
      </header>

      <main>
        {/* Aquí es donde mostramos los resultados de los cuestionarios */}
        <QuizResultsSummary />
        
        {/* En el futuro, podrías añadir más componentes aquí */}
        {/* <MisCursos /> */}
        {/* <MiActividadReciente /> */}
      </main>
    </div>
  );
};

export default DashboardPage;