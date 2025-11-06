// src/contexts/ScoreFormatContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '../api/services/settingsService';

const ScoreFormatContext = createContext();

export const useScoreFormat = () => {
  const context = useContext(ScoreFormatContext);
  if (!context) {
    throw new Error('useScoreFormat must be used within ScoreFormatProvider');
  }
  return context;
};

export const ScoreFormatProvider = ({ children }) => {
  // Cargar preferencia desde la API o localStorage temporal
  const [format, setFormat] = useState('percentage');
  const [loading, setLoading] = useState(true);

  // Cargar formato inicial desde la API
  useEffect(() => {
    const loadFormat = async () => {
      try {
        const scoreFormat = await settingsService.getScoreFormat();
        setFormat(scoreFormat);
      } catch (error) {
        console.error('Error loading score format:', error);
        // Fallback a localStorage si falla la API
        const saved = localStorage.getItem('scoreFormat');
        if (saved) {
          setFormat(saved);
        }
      } finally {
        setLoading(false);
      }
    };

    loadFormat();
  }, []);

  // Sincronizar con localStorage como backup
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('scoreFormat', format);
    }
  }, [format, loading]);

  // 🔥 NUEVA LÓGICA: El sistema trabaja INTERNAMENTE en base 10 (0-10)
  // Solo convertimos a porcentaje cuando el usuario quiere visualizar en %
  
  /**
   * Convierte un score de base 10 (almacenado) al formato de visualización elegido
   * @param {number} base10Score - Score en escala 0-10 (como viene de la BD)
   * @returns {number} Score en el formato elegido (0-10 o 0-100)
   */
  const convertScore = (base10Score) => {
    const score = parseFloat(base10Score);
    if (isNaN(score)) {
      return 0;
    }

    // Si el formato es porcentaje, multiplicamos por 10
    if (format === 'percentage') {
      return score * 10;
    }
    
    // Si es base10, devolvemos tal cual
    return score;
  };

  /**
   * Formatea un score para visualización (añade formato pero sin unidades)
   * @param {number} base10Score - Score en escala 0-10 (como viene de la BD)
   * @param {Object} options - Opciones de formateo
   * @returns {string} Score formateado como string
   */
  const formatScore = (base10Score, options = {}) => {
    const numericScore = parseFloat(base10Score);
    if (isNaN(numericScore)) {
      return '0';
    }

    if (format === 'percentage') {
      // Multiplicar por 10 para mostrar como porcentaje
      const percentageScore = numericScore * 10;
      return percentageScore % 1 === 0 ? Math.round(percentageScore) : percentageScore.toFixed(2);
    }
    
    // Para base 10, mostrar tal cual
    return numericScore % 1 === 0 ? Math.round(numericScore) : numericScore.toFixed(2);
  };

  /**
   * Convierte un score del formato de visualización elegido a base 10 (para enviar a BD)
   * @param {number} displayScore - Score en el formato actual de visualización
   * @returns {number} Score en base 10 (0-10) para almacenar
   */
  const toBase10 = (displayScore) => {
    const score = parseFloat(displayScore);
    if (isNaN(score)) {
      return 0;
    }

    // Si está en porcentaje, dividimos por 10 para guardar en base 10
    if (format === 'percentage') {
      return score / 10;
    }
    
    // Si ya está en base10, devolvemos tal cual
    return score;
  };

  // Función para obtener el label del formato actual
  const getFormatLabel = () => {
    return format === 'base10' ? 'Base 10 (0-10)' : 'Porcentaje (0-100%)';
  };

  // Función para alternar entre formatos
  const toggleFormat = () => {
    setFormat(prev => prev === 'percentage' ? 'base10' : 'percentage');
  };

  // Función para establecer un formato específico
  const setScoreFormat = (newFormat) => {
    if (newFormat === 'percentage' || newFormat === 'base10') {
      setFormat(newFormat);
    }
  };

  const value = {
    format,
    setScoreFormat,
    toggleFormat,
    convertScore,  // Convierte de base10 a formato elegido (para mostrar)
    formatScore,   // Formatea para visualización
    toBase10,      // Convierte de formato elegido a base10 (para guardar)
    getFormatLabel,
    isBase10: format === 'base10',
    isPercentage: format === 'percentage',
    loading
  };

  return (
    <ScoreFormatContext.Provider value={value}>
      {children}
    </ScoreFormatContext.Provider>
  );
};

export default ScoreFormatContext;
