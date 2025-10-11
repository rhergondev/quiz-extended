// src/hooks/useQuizAttempts.js

import { useState, useEffect, useCallback } from 'react';
// 🔥 CORRECCIÓN: Importamos getApiConfig y makeApiRequest
import { getApiConfig } from '../api/config/apiConfig'; 
import { makeApiRequest } from '../api/services/baseService';

/**
 * Hook para obtener los intentos de cuestionarios de un usuario.
 *
 * @param {object} options
 * @param {number} options.userId - El ID del usuario. Si no se provee, se asume el usuario actual.
 * @param {number} options.perPage - Resultados por página.
 * @param {boolean} options.autoFetch - Si debe hacer el fetch automáticamente al montar.
 */
export const useQuizAttempts = ({ userId, perPage = 10, autoFetch = true } = {}) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });

  const fetchAttempts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      // 🔥 CORRECCIÓN: Obtenemos la URL base de la API desde la configuración global
      const config = getApiConfig();
      const endpoint = `${config.apiUrl}/quiz-extended/v1/my-quiz-attempts`;
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      
      // Si se especifica un userId (para un admin, por ejemplo)
      if (userId) {
        params.append('user_id', userId);
      }

      const url = `${endpoint}?${params}`;
      const response = await makeApiRequest(url);

      // 🔥 CORRECCIÓN: Los datos ya vienen con 'quizTitle' y 'courseTitle' desde el PHP,
      // no necesitamos procesar '_embedded'.
      const sanitizedData = response.data.map(attempt => ({
        ...attempt,
        quizTitle: attempt.quizTitle || 'Cuestionario Desconocido',
        courseTitle: attempt.courseTitle || 'Curso Desconocido',
      }));

      setAttempts(prev => (page === 1 ? sanitizedData : [...prev, ...sanitizedData]));
      
      const newPagination = {
        currentPage: page,
        totalPages: parseInt(response.headers['X-WP-TotalPages'] || '1', 10),
        total: parseInt(response.headers['X-WP-Total'] || '0', 10),
      };
      newPagination.hasMore = newPagination.currentPage < newPagination.totalPages;
      setPagination(newPagination);

    } catch (err) {
      console.error('Error fetching quiz attempts:', err);
      setError('No se pudieron cargar los resultados de los cuestionarios.');
    } finally {
      setLoading(false);
    }
  }, [userId, perPage]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchAttempts(pagination.currentPage + 1);
    }
  }, [pagination, loading, fetchAttempts]);

  useEffect(() => {
    if (autoFetch) {
      fetchAttempts(1);
    }
  }, [autoFetch, fetchAttempts]);

  return {
    attempts,
    loading,
    error,
    pagination,
    fetchAttempts,
    loadMore,
  };
};

export default useQuizAttempts;