// src/hooks/useStudentProgress.js
import { useState, useCallback, useEffect } from 'react';
import { markContentComplete, getCourseProgress, getCompletedContent } from '../api/services/studentProgressService';

/**
 * Hook para gestionar el progreso del estudiante
 * @param {number} courseId - ID del curso
 * @param {boolean} autoFetch - Si debe cargar automáticamente al montar
 * @returns {Object} Estado y funciones para gestionar el progreso
 */
const useStudentProgress = (courseId, autoFetch = false) => {
  const [progress, setProgress] = useState(null);
  const [completedItems, setCompletedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar progreso del curso
   */
  const fetchProgress = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    setError(null);

    try {
      const progressData = await getCourseProgress(courseId);
      setProgress(progressData);
    } catch (err) {
      console.error('Error fetching course progress:', err);
      setError(err.message || 'Error al cargar el progreso');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  /**
   * Cargar contenido completado
   */
  const fetchCompletedContent = useCallback(async () => {
    if (!courseId) return;

    try {
      const completed = await getCompletedContent(courseId);
      setCompletedItems(completed || []);
    } catch (err) {
      console.error('Error fetching completed content:', err);
      setCompletedItems([]);
    }
  }, [courseId]);

  /**
   * Marcar contenido como completado
   */
  const markComplete = useCallback(async (contentId, contentType) => {
    if (!courseId) {
      throw new Error('Course ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await markContentComplete(contentId, contentType, courseId);
      
      // Actualizar el progreso local
      if (result?.progress !== undefined) {
        setProgress(prev => ({
          ...prev,
          percentage: result.progress
        }));
      }

      // Agregar a la lista de completados
      setCompletedItems(prev => {
        const exists = prev.find(item => 
          item.content_id === contentId && item.content_type === contentType
        );
        if (exists) return prev;
        
        return [...prev, {
          content_id: contentId,
          content_type: contentType,
          completed_at: new Date().toISOString()
        }];
      });

      // Refetch para asegurar consistencia
      await fetchProgress();

      return result;
    } catch (err) {
      console.error('Error marking content complete:', err);
      setError(err.message || 'Error al marcar como completado');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchProgress]);

  /**
   * Verificar si un contenido está completado
   */
  const isCompleted = useCallback((contentId, contentType) => {
    return completedItems.some(item => 
      item.content_id === contentId && 
      item.content_type === contentType
    );
  }, [completedItems]);

  /**
   * Refrescar todo el progreso
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchProgress(),
      fetchCompletedContent()
    ]);
  }, [fetchProgress, fetchCompletedContent]);

  // Auto-fetch al montar
  useEffect(() => {
    if (autoFetch && courseId) {
      refresh();
    }
  }, [autoFetch, courseId, refresh]);

  return {
    progress,
    completedItems,
    loading,
    error,
    markComplete,
    isCompleted,
    refresh,
    fetchProgress,
    fetchCompletedContent
  };
};

export default useStudentProgress;
