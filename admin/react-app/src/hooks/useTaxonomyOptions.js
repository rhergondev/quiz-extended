// src/hooks/useTaxonomyOptions.js

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getTaxonomyTerms } from '../api/services/taxonomyService';

/**
 * A generic hook to fetch and manage taxonomy terms for filter dropdowns.
 * (All comments in English as requested)
 *
 * @param {string[]} taxonomies - An array of taxonomy slugs to fetch (e.g., ['qe_category', 'qe_difficulty']).
 * @returns {object} An object containing the options for each taxonomy, loading state, and error state.
 */
export const useTaxonomyOptions = (taxonomies = []) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Do nothing if no taxonomies are requested
    if (taxonomies.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchAllTaxonomies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create an array of promises to fetch all taxonomies in parallel
        // 🔥 CORRECCIÓN: Cambiado hideEmpty a false para obtener todas las categorías.
        const promises = taxonomies.map(tax => 
          getTaxonomyTerms(tax, { hideEmpty: false })
        );
        
        const results = await Promise.all(promises);

        // Map results back to their taxonomy names
        const newOptions = {};
        taxonomies.forEach((tax, index) => {
          const terms = results[index] || [];
          newOptions[tax] = [
            { value: 'all', label: t(`courses.category.all`) }, // Generic "All" option
            ...terms.map(term => ({
              value: term.id, // Usar term.id para el filtrado correcto en la API
              label: term.name,
            }))
          ];
        });

        setOptions(newOptions);
        
      } catch (err) {
        console.error("Failed to fetch taxonomy options:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTaxonomies();
  }, [JSON.stringify(taxonomies), t]); // Use JSON.stringify to safely compare the array dependency

  return {
    options,
    isLoading,
    error,
  };
};