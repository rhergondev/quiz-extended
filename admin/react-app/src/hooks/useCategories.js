// admin/react-app/src/components/hooks/useCategories.js

import { useState, useEffect, useCallback } from 'react';
import { getCourseCategories, createCourseCategory, getCategoryStats } from '../api/index.js';

/**
 * Custom hook to manage course categories
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  // Fetch categories from WordPress
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [categoriesData, statsData] = await Promise.all([
        getCourseCategories(),
        getCategoryStats()
      ]);
      
      // Merge categories with stats
      const categoriesWithStats = categoriesData.map(category => ({
        ...category,
        count: statsData[category.name] || 0
      }));

      setCategories(categoriesWithStats);
      setStats(statsData);
      
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new category
  const addCategory = useCallback(async (categoryData) => {
    try {
      const newCategory = await createCourseCategory(categoryData);
      setCategories(prev => [...prev, { ...newCategory, count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Refresh categories (useful after creating new courses)
  const refreshCategories = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    stats,
    addCategory,
    refreshCategories,
  };
};