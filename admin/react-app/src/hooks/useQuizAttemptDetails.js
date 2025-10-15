// src/hooks/useQuizAttemptDetails.js
import { useState, useEffect, useCallback } from 'react';
import { getApiConfig } from '../api/config/apiConfig';
import { makeApiRequest } from '../api/services/baseService';

export const useQuizAttemptDetails = (attemptId) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    // Verificación inicial para evitar llamadas innecesarias
    if (!attemptId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const config = getApiConfig();
      
      // ▼▼▼ ¡ESTE ES EL CAMBIO CLAVE! ▼▼▼
      // Usamos config.apiUrl en lugar del incorrecto config.rest_url
      const url = `${config.apiUrl}/quiz-extended/v1/quiz-attempts/${attemptId}`;
      
      console.log(`🚀 Fetching attempt details from: ${url}`);

      // Reutilizamos la función 'makeApiRequest' que ya funciona en el resto de tu app
      const response = await makeApiRequest(url);

      if (response && response.data && response.data.success) {
        setDetails(response.data.data);
        console.log('✅ Attempt details loaded successfully:', response.data.data);
      } else {
        const errorMessage = response?.data?.data?.message || "La respuesta de la API no tuvo el formato esperado o falló.";
        throw new Error(errorMessage);
      }

    } catch (err) {
      console.error('❌ Error fetching attempt details:', err);
      setError(err.message || 'No se pudieron cargar los detalles del intento.');
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