import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';
import { Database, CheckCircle, AlertTriangle, Loader, Play, RefreshCw, BarChart3 } from 'lucide-react';

const MigrationPage = () => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async (type) => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const config = getApiConfig();
      const response = await makeApiRequest(
        `${config.apiUrl}/quiz-extended/v1/migrations/run`,
        {
          method: 'POST',
          body: JSON.stringify({ type })
        }
      );

      // Extract the actual data payload from the API response
      // API returns: { success: true, data: { message: '...', stats: { ... } } }
      // makeApiRequest returns: { data: { success: true, data: { ... } }, headers: ... }
      if (response.data && response.data.data) {
        setResult(response.data.data);
      } else {
        setResult(response.data);
      }
    } catch (err) {
      console.error('Migration failed:', err);
      setError(err.message || 'Migration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: getColor('primary', '#1a202c') }}>
          Gestor de Migraciones
        </h1>
        <p style={{ color: getColor('textSecondary', '#6b7280') }}>
          Ejecuta scripts de mantenimiento y corrección de datos.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Tarjeta de Migración: Actualizar Base de Datos */}
        <div 
          className="p-6 rounded-xl border-2"
          style={{
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
              >
                <Database size={24} style={{ color: getColor('primary', '#1a202c') }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                  Actualizar Esquema de Base de Datos
                </h3>
                <p className="text-sm mt-1" style={{ color: getColor('textSecondary', '#6b7280') }}>
                  Ejecuta <code>dbDelta</code> para asegurar que todas las tablas y columnas necesarias existen.
                  Usa esto si has actualizado el plugin y faltan columnas (ej. <code>lesson_id</code>).
                </p>
              </div>
            </div>
            <button
              onClick={() => runMigration('update_database_schema')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: getColor('primary', '#1a202c'),
                color: '#ffffff'
              }}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
              <span>Ejecutar</span>
            </button>
          </div>

          {/* Resultados */}
          {result && result.stats && result.stats.version !== undefined && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2 text-green-700 font-bold">
                <CheckCircle size={18} />
                <span>Actualización Completada</span>
              </div>
              <div className="text-sm text-green-800">
                <span className="font-semibold">Versión DB:</span> {result.stats?.version}
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de Migración: Relación Lección-Curso */}
        <div 
          className="p-6 rounded-xl border-2"
          style={{
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
              >
                <Database size={24} style={{ color: getColor('primary', '#1a202c') }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                  Corregir Relaciones Lección-Curso
                </h3>
                <p className="text-sm mt-1" style={{ color: getColor('textSecondary', '#6b7280') }}>
                  Asigna el <code>_course_id</code> a cada lección basándose en la lista de lecciones del curso.
                  También sincroniza los quizzes asociados.
                </p>
              </div>
            </div>
            <button
              onClick={() => runMigration('fix_lesson_course_relationships')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: getColor('primary', '#1a202c'),
                color: '#ffffff'
              }}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
              <span>Ejecutar</span>
            </button>
          </div>

          {/* Resultados */}
          {result && result.stats && result.stats.lessons_updated !== undefined && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2 text-green-700 font-bold">
                <CheckCircle size={18} />
                <span>Migración Completada</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-green-800">
                <div>
                  <span className="block font-semibold">Cursos Procesados:</span>
                  {result.stats?.courses_processed}
                </div>
                <div>
                  <span className="block font-semibold">Lecciones Actualizadas:</span>
                  {result.stats?.lessons_updated}
                </div>
                <div>
                  <span className="block font-semibold">Quizzes Sincronizados:</span>
                  {result.stats?.quizzes_synced}
                </div>
              </div>
            </div>
          )}

          {/* Errores */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tarjeta de Migración: Sincronizar Quizzes */}
        <div 
          className="p-6 rounded-xl border-2"
          style={{
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
              >
                <RefreshCw size={24} style={{ color: getColor('primary', '#1a202c') }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                  Sincronizar IDs de Cursos en Quizzes
                </h3>
                <p className="text-sm mt-1" style={{ color: getColor('textSecondary', '#6b7280') }}>
                  Reconstruye los campos <code>_course_ids</code> y <code>_lesson_id</code> en todos los quizzes.
                  Esencial para que los filtros de historial funcionen correctamente.
                </p>
              </div>
            </div>
            <button
              onClick={() => runMigration('sync_quiz_course_ids')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: getColor('primary', '#1a202c'),
                color: '#ffffff'
              }}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
              <span>Ejecutar</span>
            </button>
          </div>

          {/* Resultados */}
          {result && result.stats && result.stats.synced !== undefined && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2 text-green-700 font-bold">
                <CheckCircle size={18} />
                <span>Sincronización Completada</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-green-800">
                <div>
                  <span className="block font-semibold">Total Quizzes:</span>
                  {result.stats?.total}
                </div>
                <div>
                  <span className="block font-semibold">Sincronizados:</span>
                  {result.stats?.synced}
                </div>
                <div>
                  <span className="block font-semibold">Errores:</span>
                  {result.stats?.errors}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de Migración: Migrar Preguntas a Multi-Relación */}
        <div 
          className="p-6 rounded-xl border-2"
          style={{
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
              >
                <Database size={24} style={{ color: getColor('primary', '#1a202c') }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                  Migrar Preguntas a Multi-Relación
                </h3>
                <p className="text-sm mt-1" style={{ color: getColor('textSecondary', '#6b7280') }}>
                  Convierte las asociaciones antiguas de preguntas (<code>_course_id</code>, <code>_lesson_id</code>) al nuevo formato de arrays (<code>_course_ids</code>, <code>_lesson_ids</code>).
                  Necesario para el filtrado avanzado en el Generador de Quizzes.
                </p>
              </div>
            </div>
            <button
              onClick={() => runMigration('migrate_questions_to_multirelationship')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: getColor('primary', '#1a202c'),
                color: '#ffffff'
              }}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
              <span>Ejecutar</span>
            </button>
          </div>

          {/* Resultados */}
          {result && result.stats && result.stats.updated !== undefined && result.stats.processed !== undefined && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3 text-green-700 font-bold">
                <CheckCircle size={18} />
                <span>Migración Completada</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-800 mb-3">
                <div>
                  <span className="block font-semibold">Total:</span>
                  {result.stats?.total?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Procesados:</span>
                  {result.stats?.processed?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Actualizados:</span>
                  <span className="text-green-600 font-bold">{result.stats?.updated?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block font-semibold">Ya Migrados:</span>
                  {result.stats?.already_migrated?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Sin Relaciones:</span>
                  {result.stats?.no_relations?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Omitidos:</span>
                  {result.stats?.skipped?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Batches:</span>
                  {result.stats?.batches_completed}
                </div>
                <div>
                  <span className="block font-semibold">Errores:</span>
                  <span className={result.stats?.errors > 0 ? "text-red-600 font-bold" : ""}>
                    {result.stats?.errors?.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Detalles de errores si hay */}
              {result.stats?.error_details && result.stats.error_details.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-red-700 font-semibold mb-2">Detalles de Errores (primeros 10):</p>
                  <ul className="text-xs text-red-600 space-y-1">
                    {result.stats.error_details.map((err, idx) => (
                      <li key={idx}>
                        <strong>Pregunta #{err.question_id}:</strong> {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="text-xs text-green-600 mt-3 italic">
                ✅ Es seguro ejecutar esta migración múltiples veces. Los datos no se duplicarán.
              </p>
            </div>
          )}
        </div>

        {/* Tarjeta de Migración: Construir Estadísticas de Preguntas */}
        <div 
          className="p-6 rounded-xl border-2"
          style={{
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#10b98120' }}
              >
                <BarChart3 size={24} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                  Construir Estadísticas de Preguntas
                </h3>
                <p className="text-sm mt-1" style={{ color: getColor('textSecondary', '#6b7280') }}>
                  Pre-calcula las estadísticas de respuestas para cada usuario y pregunta.
                  <strong className="text-amber-600"> Ejecutar después de migrar o si las estadísticas no cargan.</strong>
                  <br />
                  <span className="text-xs">Los nuevos intentos de quiz actualizarán automáticamente estas estadísticas.</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => runMigration('build_user_question_stats')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff'
              }}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
              <span>Ejecutar</span>
            </button>
          </div>

          {/* Resultados de build_user_question_stats */}
          {result && result.stats && result.stats.total_records !== undefined && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3 text-green-700 font-bold">
                <CheckCircle size={18} />
                <span>Estadísticas Construidas</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-800 mb-3">
                <div>
                  <span className="block font-semibold">Total Combinaciones:</span>
                  {result.stats?.total_records?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Procesados:</span>
                  {result.stats?.processed?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Insertados:</span>
                  <span className="text-green-600 font-bold">{result.stats?.inserted?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block font-semibold">Actualizados:</span>
                  <span className="text-blue-600 font-bold">{result.stats?.updated?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block font-semibold">Usuarios:</span>
                  {result.stats?.batches_completed?.toLocaleString()}
                </div>
                <div>
                  <span className="block font-semibold">Errores:</span>
                  <span className={result.stats?.errors > 0 ? "text-red-600 font-bold" : ""}>
                    {result.stats?.errors?.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Log de progreso */}
              {result.stats?.log && result.stats.log.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 max-h-48 overflow-y-auto">
                  <p className="text-gray-700 font-semibold mb-2">📋 Log de Ejecución:</p>
                  <ul className="text-xs text-gray-600 space-y-1 font-mono">
                    {result.stats.log.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="text-xs text-green-600 mt-3 italic">
                ✅ Es seguro ejecutar esta migración múltiples veces. Los datos existentes se actualizarán.
              </p>
            </div>
          )}

          {/* Error específico de esta migración */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;
