import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Loader, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateGhostUsers, getGhostUsers, deleteGhostUsers } from '../../api/services/ghostUsersService';

const GhostUsersPanel = ({ courseId }) => {
  const { t } = useTranslation();
  const [ghostUsers, setGhostUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userCount, setUserCount] = useState(20);
  const [generationResult, setGenerationResult] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const fetchGhostUsers = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getGhostUsers(courseId);
      setGhostUsers(result.data?.users || []);
    } catch (err) {
      console.error('Error fetching ghost users:', err);
      setError('Error al cargar usuarios fantasma');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchGhostUsers();
  }, [fetchGhostUsers]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    setGenerationResult(null);

    try {
      const result = await generateGhostUsers(courseId, userCount);
      const data = result.data;
      
      // Store detailed generation result
      setGenerationResult(data);
      
      // Build success message with statistics
      const stats = data?.quiz_statistics;
      const quizErrors = data?.quiz_errors || [];
      
      if (stats) {
        const successRate = stats.total_attempts_expected > 0 
          ? Math.round((stats.successful_attempts / stats.total_attempts_expected) * 100) 
          : 0;
        
        let message = `Se crearon ${data?.created_count || 0} usuarios fantasma. `;
        message += `Cuestionarios: ${stats.successful_attempts}/${stats.total_attempts_expected} intentos exitosos (${successRate}%).`;
        
        if (quizErrors.length > 0) {
          message += ` ⚠️ ${quizErrors.length} cuestionario(s) con errores.`;
          setShowErrorDetails(true);
        }
        
        setSuccess(message);
      } else {
        setSuccess(`Se crearon ${data?.created_count || 0} usuarios fantasma con sus intentos de cuestionarios`);
      }
      
      fetchGhostUsers();
    } catch (err) {
      console.error('Error generating ghost users:', err);
      setError(err.response?.data?.message || 'Error al generar usuarios fantasma');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de eliminar todos los usuarios fantasma de este curso? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteGhostUsers(courseId);
      setSuccess(result.data?.message || 'Usuarios fantasma eliminados');
      setGhostUsers([]);
    } catch (err) {
      console.error('Error deleting ghost users:', err);
      setError('Error al eliminar usuarios fantasma');
    } finally {
      setDeleting(false);
    }
  };

  if (!courseId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
        <p>Guarda el curso primero para poder gestionar usuarios fantasma</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900">¿Qué son los usuarios fantasma?</h4>
            <p className="text-sm text-blue-700 mt-1">
              Los usuarios fantasma simulan actividad en el curso para crear un baseline de rankings. 
              Son usuarios reales de WordPress pero marcados internamente como fantasma, 
              por lo que sus notas aparecen en las estadísticas pero no son visibles para los estudiantes regulares.
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Quiz Errors Details */}
      {generationResult?.quiz_errors?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-900">
                  {generationResult.quiz_errors.length} Cuestionario(s) con errores
                </p>
                <p className="text-sm text-orange-700">
                  Estos cuestionarios no pudieron procesarse para los usuarios fantasma
                </p>
              </div>
            </div>
            {showErrorDetails ? (
              <ChevronUp className="h-5 w-5 text-orange-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-orange-600" />
            )}
          </button>
          
          {showErrorDetails && (
            <div className="border-t border-orange-200 p-4">
              <div className="space-y-3">
                {generationResult.quiz_errors.map((quizError) => (
                  <div 
                    key={quizError.quiz_id} 
                    className="bg-white border border-orange-100 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {quizError.quiz_title}
                        </p>
                        <p className="text-sm text-gray-500">
                          ID: {quizError.quiz_id}
                        </p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        {quizError.affected_users} usuario(s) afectados
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                      <p className="text-red-700">
                        <strong>Error ({quizError.error_code}):</strong> {quizError.error}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Statistics Summary */}
              {generationResult.quiz_statistics && (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <h5 className="text-sm font-medium text-orange-900 mb-2">Resumen de Estadísticas</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border border-orange-100">
                      <p className="text-gray-500">Total cuestionarios</p>
                      <p className="font-semibold text-gray-900">
                        {generationResult.quiz_statistics.total_quizzes_in_course}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded border border-orange-100">
                      <p className="text-gray-500">Intentos esperados</p>
                      <p className="font-semibold text-gray-900">
                        {generationResult.quiz_statistics.total_attempts_expected}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded border border-green-100">
                      <p className="text-green-600">Exitosos</p>
                      <p className="font-semibold text-green-700">
                        {generationResult.quiz_statistics.successful_attempts}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded border border-red-100">
                      <p className="text-red-600">Fallidos</p>
                      <p className="font-semibold text-red-700">
                        {generationResult.quiz_statistics.failed_attempts}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generate Section */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Generar Usuarios Fantasma</h4>
        
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad de usuarios
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={userCount}
              onChange={(e) => setUserCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full input border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Máximo 50 usuarios por generación</p>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Generar Usuarios
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Cada usuario generado:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1 text-gray-500">
            <li>Tendrá un nombre español aleatorio</li>
            <li>Será inscrito en el curso con progreso del 100%</li>
            <li>Completará todos los cuestionarios del curso</li>
            <li>Obtendrá notas aleatorias entre 4-9 (con y sin riesgo)</li>
            <li>Aparecerá en los rankings del curso</li>
          </ul>
        </div>
      </div>

      {/* Current Ghost Users */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">
            Usuarios Fantasma Actuales ({ghostUsers.length})
          </h4>
          <div className="flex gap-2">
            <button
              onClick={fetchGhostUsers}
              disabled={loading}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            
            {ghostUsers.length > 0 && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
              >
                {deleting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar Todos
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : ghostUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No hay usuarios fantasma en este curso</p>
            <p className="text-sm mt-1">Genera algunos para poblar los rankings</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Nombre</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Email</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">Intentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ghostUsers.map((user) => (
                  <tr key={user.ID} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{user.display_name}</td>
                    <td className="py-2 px-3 text-gray-500">{user.user_email}</td>
                    <td className="py-2 px-3 text-center text-gray-600">{user.attempts_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Importante</p>
            <p className="mt-1">
              Los usuarios fantasma son usuarios reales de WordPress. Si eliminas el curso, 
              recuerda eliminar primero los usuarios fantasma para mantener la base de datos limpia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GhostUsersPanel;
