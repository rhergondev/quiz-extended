import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
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

    try {
      const result = await generateGhostUsers(courseId, userCount);
      setSuccess(`Se crearon ${result.data?.created_count || 0} usuarios fantasma con sus intentos de cuestionarios`);
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
