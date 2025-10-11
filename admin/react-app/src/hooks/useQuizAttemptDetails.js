// src/hooks/useQuizAttemptDetails.js

import { useState, useEffect, useCallback } from 'react';
import { getApiConfig } from '../api/config/apiConfig';
import { makeApiRequest } from '../api/services/baseService';

export const useQuizAttemptDetails = (attemptId) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!attemptId) return;

    setLoading(true);
    setError(null);
    try {
      const config = getApiConfig();
      const url = `${config.apiUrl}/quiz-extended/v1/quiz-attempts/${attemptId}`;
      const response = await makeApiRequest(url);

      // 🔥 CORRECCIÓN: Accedemos a la propiedad "data" anidada en la respuesta.
      // La API devuelve { success: true, data: { ... } }, nosotros necesitamos el contenido de "data".
      if (response && response.data && response.data.success) {
        setDetails(response.data.data);
      } else {
        throw new Error("La respuesta de la API no tuvo el formato esperado.");
      }
      
    } catch (err) {
      setError('No se pudieron cargar los detalles del intento.');
      console.error('Error fetching attempt details:', err);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { details, loading, error, refetch: fetchDetails };
};

export default useQuizAttemptDetails;