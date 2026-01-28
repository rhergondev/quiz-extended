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
 * @param {number} options.courseId - Filtrar por curso específico.
 * @param {number} options.perPage - Resultados por página.
 * @param {boolean} options.autoFetch - Si debe hacer el fetch automáticamente al montar.
 * @param {object} options.filters - Filtros adicionales (search, lesson_id, date_from, date_to).
 */
export const useQuizAttempts = ({ userId, courseId, quizId, perPage = 10, autoFetch = true, filters = {} } = {}) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });

  const fetchAttempts = useCallback(async (page = 1, customFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
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

      // Filtrar por curso
      if (courseId) {
        params.append('course_id', courseId.toString());
      }

      // Filtrar por quiz específico
      if (quizId) {
        params.append('quiz_id', quizId.toString());
      }

      // Aplicar filtros adicionales
      const activeFilters = { ...filters, ...customFilters };
      if (activeFilters.search) {
        params.append('search', activeFilters.search);
      }
      if (activeFilters.lesson_id) {
        params.append('lesson_id', activeFilters.lesson_id);
      }
      if (activeFilters.date_from) {
        params.append('date_from', activeFilters.date_from);
      }
      if (activeFilters.date_to) {
        params.append('date_to', activeFilters.date_to);
      }

      const url = `${endpoint}?${params}`;
      const response = await makeApiRequest(url);

      const sanitizedData = response.data.map(attempt => ({
        ...attempt,
        quizTitle: attempt.quizTitle || 'Cuestionario Desconocido',
        courseTitle: attempt.courseTitle || 'Curso Desconocido',
        lessonTitle: attempt.lessonTitle || 'Sin lección',
      }));

      // Para paginación normal (no infinite scroll), siempre reemplazar
      setAttempts(sanitizedData);
      
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
  }, [userId, courseId, quizId, perPage, filters.search, filters.lesson_id, filters.date_from, filters.date_to]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchAttempts(pagination.currentPage + 1);
    }
  }, [pagination, loading, fetchAttempts]);

  useEffect(() => {
    if (autoFetch) {
      fetchAttempts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

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