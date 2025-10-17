import React from 'react';

// --- Componentes del Dashboard ---
// Asumo que tienes componentes como estos para la cabecera y las estadísticas.
// Si no los tienes, puedes eliminar estas líneas y sus usos más abajo.
import PageHeader from '../components/common/PageHeader';
import StatisticsBar from '../components/common/StatisticsBar';

// --- Importamos el Widget de Mensajes ---
import MessagesDashboardWidget from '../components/messages/MessageDashboardWidget';

/**
 * Página principal del Dashboard del Administrador.
 * * Esta página sirve como el punto central para el administrador, mostrando
 * estadísticas clave y herramientas de gestión importantes, como el nuevo
 * widget de la bandeja de entrada de mensajes.
 */
const DashboardPage = () => {
    
    // Datos de ejemplo para la barra de estadísticas.
    // Puedes conectar esto a datos reales de tu API.
    const exampleStats = [
        { label: 'Usuarios Totales', value: '1,234' },
        { label: 'Cursos Activos', value: '56' },
        { label: 'Nuevos Mensajes', value: '8' }, // Este podría venir del hook useMessages
        { label: 'Preguntas', value: '2,500' }
    ];

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            
            {/* 1. Cabecera de la Página */}
            <PageHeader 
                title="Panel de Administración" 
                subtitle="Bienvenido, aquí tienes un resumen de la actividad de tu plataforma."
            />

            {/* 2. Barra de Estadísticas */}
            <div className="my-8">
                <StatisticsBar stats={exampleStats} />
            </div>

            {/* 3. Widget de Mensajes */}
            {/* Aquí es donde integramos el componente de la bandeja de entrada */}
            <div className="mt-8">
                <MessagesDashboardWidget />
            </div>

            {/* Puedes añadir más widgets y componentes aquí en el futuro.
                Por ejemplo:
                - Gráficos de actividad de usuarios.
                - Últimos cursos publicados.
                - Enlaces rápidos a tareas comunes.
            */}

        </div>
    );
};

export default DashboardPage;