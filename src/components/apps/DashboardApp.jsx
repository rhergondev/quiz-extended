import React from 'react';

const DashboardApp = () => {
    return (
        <div className="min-h-screen bg-gray-100 font-sans p-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    Quiz Extended Dashboard
                </h1>
                <p className="text-gray-600 mb-6">
                    Bienvenido al panel de administración de Quiz Extended. 
                    Utiliza el menú lateral para navegar por las diferentes secciones.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-800 mb-2">Questions</h3>
                        <p className="text-blue-600 text-sm">
                            Gestiona y crea preguntas para tus cuestionarios.
                        </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-800 mb-2">Quizzes</h3>
                        <p className="text-green-600 text-sm">
                            Próximamente: Administración de cuestionarios.
                        </p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 mb-2">Analytics</h3>
                        <p className="text-purple-600 text-sm">
                            Próximamente: Estadísticas y reportes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardApp;