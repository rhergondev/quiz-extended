// src/pages/LmsHomePage.jsx

import React from 'react';

const LmsHomePage = () => {
  return (
    <>
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold text-primary font-sans"> {/* <-- Clase actualizada */}
              Quiz Extended LMS
            </div>
            <div>
              <a href="#" className="text-text-main hover:text-primary font-sans">Mi Cuenta</a> {/* <-- Clases actualizadas */}
            </div>
          </div>
        </nav>
      </header>

      <main className="flex items-center justify-center bg-gray-light" style={{ minHeight: 'calc(100vh - 68px)' }}> {/* <-- Clase actualizada */}
        <div className="text-center p-10">
          <h1 className="text-4xl font-bold text-primary mb-4 font-sans"> {/* <-- Clases actualizadas */}
            ¡Bienvenido a tu Panel de Aprendizaje!
          </h1>
          <p className="text-text-main text-lg font-sans"> {/* <-- Clases actualizadas */}
            Aquí encontrarás tus cursos, progreso y mucho más.
          </p>
          <button className="mt-8 px-6 py-3 bg-accent text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors"> {/* <-- Usando el color de Énfasis */}
            Ver mis Cursos
          </button>
        </div>
      </main>
    </>
  );
};

export default LmsHomePage;