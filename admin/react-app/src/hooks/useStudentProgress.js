// src/hooks/useStudentProgress.js
import { useState, useCallback, useEffect } from 'react';
import { markContentComplete, unmarkContentComplete, getCourseProgress, getCompletedContent } from '../api/services/studentProgressService';

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
   * @param {number} contentId - ID del contenido
   * @param {string} contentType - Tipo del contenido
   * @param {number} [parentLessonId] - ID de la lección padre (para steps)
   * @param {number} [stepIndex] - Índice del step (para steps)
   */
  const markComplete = useCallback(async (contentId, contentType, parentLessonId = null, stepIndex = null) => {
    if (!courseId) {
      throw new Error('Course ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await markContentComplete(contentId, contentType, courseId, parentLessonId, stepIndex);
      
      // Actualizar el progreso local
      if (result?.progress !== undefined) {
        setProgress(prev => ({
          ...prev,
          percentage: result.progress
        }));
      }

      // Crear identificador único para steps
      let uniqueId = contentId;
      if (contentType === 'step' && parentLessonId !== null && stepIndex !== null) {
        uniqueId = (parentLessonId * 10000) + stepIndex;
      }

      // Agregar a la lista de completados
      setCompletedItems(prev => {
        const exists = prev.find(item => 
          item.content_id === uniqueId && item.content_type === contentType
        );
        if (exists) return prev;
        
        return [...prev, {
          content_id: uniqueId,
          content_type: contentType,
          completed_at: new Date().toISOString()
        }];
      });

      // Refetch para asegurar consistencia
      await fetchProgress();
      await fetchCompletedContent();

      return result;
    } catch (err) {
      console.error('Error marking content complete:', err);
      setError(err.message || 'Error al marcar como completado');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchProgress, fetchCompletedContent]);

  /**
   * Desmarcar contenido (quitar completado)
   * @param {number} contentId - ID del contenido
   * @param {string} contentType - Tipo del contenido
   * @param {number} [parentLessonId] - ID de la lección padre (para steps)
   * @param {number} [stepIndex] - Índice del step (para steps)
   */
  const unmarkComplete = useCallback(async (contentId, contentType, parentLessonId = null, stepIndex = null) => {
    if (!courseId) {
      throw new Error('Course ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await unmarkContentComplete(contentId, contentType, courseId, parentLessonId, stepIndex);
      
      // Actualizar el progreso local
      if (result?.progress !== undefined) {
        setProgress(prev => ({
          ...prev,
          percentage: result.progress
        }));
      }

      // Crear identificador único para steps
      let uniqueId = contentId;
      if (contentType === 'step' && parentLessonId !== null && stepIndex !== null) {
        uniqueId = (parentLessonId * 10000) + stepIndex;
      }

      // Remover de la lista de completados
      setCompletedItems(prev => 
        prev.filter(item => 
          !(item.content_id === uniqueId && item.content_type === contentType)
        )
      );

      // Refetch para asegurar consistencia
      await fetchProgress();
      await fetchCompletedContent();

      return result;
    } catch (err) {
      console.error('Error unmarking content:', err);
      setError(err.message || 'Error al desmarcar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchProgress, fetchCompletedContent]);

  /**
   * Verificar si un contenido está completado
   * @param {number} contentId - ID del contenido
   * @param {string} contentType - Tipo del contenido
   * @param {number} [parentLessonId] - ID de la lección padre (para steps)
   * @param {number} [stepIndex] - Índice del step (para steps)
   */
  const isCompleted = useCallback((contentId, contentType, parentLessonId = null, stepIndex = null) => {
    // Crear identificador único para steps
    let uniqueId = contentId;
    if (contentType === 'step' && parentLessonId !== null && stepIndex !== null) {
      uniqueId = (parentLessonId * 10000) + stepIndex;
    }

    return completedItems.some(item => 
      item.content_id === uniqueId && 
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
    unmarkComplete,
    isCompleted,
    refresh,
    fetchProgress,
    fetchCompletedContent
  };
};

export default useStudentProgress;
