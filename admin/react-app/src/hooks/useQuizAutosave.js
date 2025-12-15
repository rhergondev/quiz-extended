import { useState, useEffect, useRef, useCallback } from 'react';
import quizAutosaveService from '../api/services/quizAutosaveService';

/**
 * Hook for automatic quiz autosave with debounce
 * Saves quiz state automatically when answers change
 * 
 * @param {Object} params
 * @param {number} params.quizId - Quiz ID
 * @param {Object} params.quizData - Complete quiz data
 * @param {number[]} params.shuffledQuestionIds - Current order of question IDs (possibly shuffled)
 * @param {number} params.currentQuestionIndex - Current question index
 * @param {Object} params.answers - User answers object
 * @param {number} params.timeRemaining - Time remaining in seconds (optional)
 * @param {number} params.attemptId - Attempt ID (optional)
 * @param {boolean} params.enabled - Enable/disable autosave (default: true)
 * @param {number} params.debounceMs - Debounce delay in ms (default: 1000)
 * @returns {Object} { isSaving, lastSaved, saveNow, clearAutosave, error }
 */
const useQuizAutosave = ({
  quizId,
  quizData,
  shuffledQuestionIds,
  currentQuestionIndex,
  answers,
  timeRemaining,
  attemptId,
  enabled = true,
  debounceMs = 1000,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  
  const saveTimeoutRef = useRef(null);
  const previousStateRef = useRef(null);

  /**
   * Save quiz progress immediately
   */
  const saveNow = useCallback(async () => {
    if (!quizId || !quizData || !enabled) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const saveData = {
        quiz_id: quizId,
        quiz_data: quizData,
        shuffled_question_ids: shuffledQuestionIds || [],
        current_question_index: currentQuestionIndex || 0,
        answers: answers || {},
        time_remaining: timeRemaining || null,
        attempt_id: attemptId || null,
      };

      await quizAutosaveService.saveProgress(saveData);
      
      setLastSaved(new Date());
      previousStateRef.current = JSON.stringify(saveData);
    } catch (err) {
      console.error('Error autosaving quiz:', err);
      setError(err.message || 'Error al guardar el progreso');
    } finally {
      setIsSaving(false);
    }
  }, [quizId, quizData, shuffledQuestionIds, currentQuestionIndex, answers, timeRemaining, attemptId, enabled]);

  /**
   * Clear autosave for this quiz
   */
  const clearAutosave = useCallback(async () => {
    if (!quizId) {
      return;
    }

    try {
      // Clear any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      await quizAutosaveService.deleteAutosave(quizId);
      setLastSaved(null);
      previousStateRef.current = null;
    } catch (err) {
      console.error('Error clearing autosave:', err);
      setError(err.message || 'Error al eliminar el autoguardado');
    }
  }, [quizId]);

  /**
   * Debounced autosave effect
   * Triggers when answers or currentQuestionIndex change
   */
  useEffect(() => {
    if (!enabled || !quizId || !quizData) {
      return;
    }

    // Create current state snapshot
    const currentState = JSON.stringify({
      quiz_id: quizId,
      shuffled_question_ids: shuffledQuestionIds || [],
      current_question_index: currentQuestionIndex || 0,
      answers: answers || {},
      time_remaining: timeRemaining || null,
    });

    // Only save if state has changed
    if (currentState === previousStateRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveNow();
    }, debounceMs);

    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    quizId,
    quizData,
    currentQuestionIndex,
    answers,
    timeRemaining,
    enabled,
    debounceMs,
    saveNow,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    saveNow,
    clearAutosave,
    error,
  };
};

export default useQuizAutosave;
