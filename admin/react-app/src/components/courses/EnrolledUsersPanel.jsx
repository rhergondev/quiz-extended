import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, RefreshCw, Mail, Calendar, BookOpen, Award, Ghost, ChevronLeft, ChevronRight } from 'lucide-react';
import { makeApiRequest } from '../../api/services/baseService';

/**
 * Panel to display enrolled users for a course
 * Shows real users by default, with option to include ghost users
 */
const EnrolledUsersPanel = ({ courseId }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeGhosts, setIncludeGhosts] = useState(false);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 0,
    course_title: ''
  });

  const fetchEnrolledUsers = useCallback(async (page = 1) => {
    if (!courseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Build URL with query params
      const baseUrl = window.qe_data?.rest_url || '/wp-json/';
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: meta.per_page.toString(),
        include_ghosts: includeGhosts.toString()
      });
      const url = `${baseUrl}qe/v1/courses/${courseId}/enrolled-users?${params}`;
      
      const response = await makeApiRequest(url);
      
      // makeApiRequest returns { data, headers } where data is the JSON response
      const result = response.data;
      
      if (result?.success) {
        setUsers(result.data || []);
        setMeta(result.meta || meta);
      } else {
        setError(result?.error || 'Error al cargar estudiantes');
      }
    } catch (err) {
      console.error('Error fetching enrolled users:', err);
      setError(err.message || 'Error al cargar estudiantes inscritos');
    } finally {
      setLoading(false);
    }
  }, [courseId, includeGhosts, meta.per_page]);

  useEffect(() => {
    fetchEnrolledUsers(1);
  }, [courseId, includeGhosts]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= meta.total_pages) {
      fetchEnrolledUsers(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 7) return 'text-green-600 bg-green-50';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Estudiantes Inscritos</h3>
            <p className="text-sm text-gray-500">
              {meta.total} estudiante{meta.total !== 1 ? 's' : ''} {includeGhosts ? '(incluyendo fantasmas)' : '(reales)'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Ghost toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeGhosts}
              onChange={(e) => setIncludeGhosts(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Ghost className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Incluir fantasmas</span>
          </label>
          
          {/* Refresh button */}
          <button
            onClick={() => fetchEnrolledUsers(meta.page)}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No hay estudiantes inscritos</p>
          <p className="text-sm mt-1">Los estudiantes aparecerán aquí cuando se inscriban al curso</p>
        </div>
      ) : (
        <>
          {/* Users table */}
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Inscripción
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      Intentos
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="h-3.5 w-3.5" />
                      Promedio
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mejor Nota
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${user.is_ghost ? 'bg-purple-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                          {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                            {user.is_ghost && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                <Ghost className="h-3 w-3" />
                                Fantasma
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(user.enrollment_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {user.total_attempts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.total_attempts > 0 ? (
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 text-xs font-medium rounded ${getScoreColor(user.avg_score)}`}>
                          {user.avg_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.total_attempts > 0 ? (
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 text-xs font-medium rounded ${getScoreColor(user.best_score)}`}>
                          {user.best_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-gray-500">
                Mostrando {((meta.page - 1) * meta.per_page) + 1} - {Math.min(meta.page * meta.per_page, meta.total)} de {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page === 1}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Página {meta.page} de {meta.total_pages}
                </span>
                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page === meta.total_pages}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnrolledUsersPanel;
