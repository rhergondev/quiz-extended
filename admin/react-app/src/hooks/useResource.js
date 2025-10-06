/**
 * useResource - Generic Resource Management Hook
 * * Base hook that provides CRUD operations, pagination, and filtering
 * for any WordPress REST API resource
 * * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Generic resource management hook
 * * @param {Object} options - Configuration options
 * @param {Object} options.service - Service object with CRUD methods (from baseService)
 * @param {string} options.resourceName - Resource name for logging (e.g., 'course', 'lesson')
 * @param {Object} options.initialFilters - Initial filter values
 * @param {number} options.debounceMs - Debounce delay for filter changes (default: 500ms)
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 20)
 * @param {Function} options.dataProcessor - Custom function to process/enhance fetched data
 * @param {Function} options.computedValuesCalculator - Custom function to calculate computed values
 * @returns {Object} Resource state and methods
 */
export const useResource = ({
  service,
  resourceName = 'resource',
  initialFilters = {},
  debounceMs = 500,
  autoFetch = true,
  perPage = 20,
  dataProcessor = null,
  computedValuesCalculator = null
}) => {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: perPage,
    hasMore: false
  });

  const [filters, setFilters] = useState({
    search: '',
    ...initialFilters
  });

  // ============================================================
  // REFS
  // ============================================================
  
  const debounceTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const lastFetchParamsRef = useRef('');
  const isFirstRenderRef = useRef(true);
  
  // 🔥 CORRECCIÓN: Se añade un useEffect para que el hook reaccione a los cambios en los filtros.
  // Esto es lo que hace que el filtrado funcione dinámicamente.
  const initialFiltersJSON = JSON.stringify(initialFilters);
  useEffect(() => {
    if (!isFirstRenderRef.current) {
        setFilters({
            search: '',
            ...initialFilters,
        });
    }
  }, [initialFiltersJSON]);


  // ============================================================
  // CLEANUP
  // ============================================================
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================
  // FETCH ITEMS
  // ============================================================
  
  const fetchItems = useCallback(async (reset = false, options = {}) => {
    try {
      if (!service || !service.getAll) {
        console.error(`❌ ${resourceName}: Invalid service provided`);
        return;
      }

      const activeFilters = { ...filters, ...options };

      // Prevent duplicate fetches
      const currentParams = JSON.stringify({ reset, filters: activeFilters, page: pagination.currentPage });
      if (currentParams === lastFetchParamsRef.current && !reset) {
        console.log(`⏭️ ${resourceName}: Skipping duplicate fetch`);
        return;
      }
      lastFetchParamsRef.current = currentParams;

      if (reset) {
        setLoading(true);
      }
      setError(null);

      const page = reset ? 1 : pagination.currentPage;
      
      // Build filter options (remove 'all' values and empty strings)
      const filterOptions = {};
      Object.keys(activeFilters).forEach(key => {
        const value = activeFilters[key];
        if (value && value !== 'all' && value !== '') {
          filterOptions[key] = value;
        }
      });

      console.log(`🔄 Fetching ${resourceName}s:`, { page, perPage, filters: filterOptions });

      const result = await service.getAll({
        ...filterOptions,
        page,
        perPage: pagination.perPage
      });

      if (!mountedRef.current) return;

      // Process data if processor provided
      let processedData = result.data || [];
      if (dataProcessor && typeof dataProcessor === 'function') {
        processedData = processedData.map(dataProcessor);
      }

      // Update items
      if (reset) {
        setItems(processedData);
      } else {
        setItems(prev => [...prev, ...processedData]);
      }

      // Update pagination
      setPagination(prev => ({
        ...prev,
        currentPage: reset ? 1 : page,
        totalPages: result.pagination?.totalPages || 1,
        total: result.pagination?.total || 0,
        hasMore: result.pagination?.currentPage < result.pagination?.totalPages
      }));

      console.log(`✅ ${resourceName}s fetched:`, {
        count: processedData.length,
        total: result.pagination?.total || 0
      });

    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error(`❌ Error fetching ${resourceName}s:`, err);
      setError(err.message || `Failed to fetch ${resourceName}s`);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [service, resourceName, filters, pagination.currentPage, pagination.perPage, dataProcessor]);

  // ============================================================
  // LOAD MORE (Infinite Scroll)
  // ============================================================
  
  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({
        ...prev,
        currentPage: prev.currentPage + 1
      }));
    }
  }, [pagination.hasMore, loading]);

  // ============================================================
  // CREATE ITEM
  // ============================================================
  
  const createItem = useCallback(async (data) => {
    try {
      setCreating(true);
      setError(null);
      console.log(`📝 Creating ${resourceName}:`, data);
  
      const newItem = await service.create(data);
      if (!mountedRef.current) return null;
  
      const fullNewItem = await service.getOne(newItem.id);
      if (!mountedRef.current) return null;
  
      const processedItem = dataProcessor ? dataProcessor(fullNewItem) : fullNewItem;
  
      setItems(prev => [processedItem, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  
      console.log(`✅ ${resourceName} created with full data:`, processedItem.id);
      return processedItem;
  
    } catch (err) {
      if (!mountedRef.current) return null;
      console.error(`❌ Error creating ${resourceName}:`, err);
      setError(err.message || `Failed to create ${resourceName}`);
      throw err;
    } finally {
      if (mountedRef.current) {
        setCreating(false);
      }
    }
  }, [service, resourceName, dataProcessor]);

  // ============================================================
  // UPDATE ITEM
  // ============================================================
  
  const updateItem = useCallback(async (id, data) => {
    try {
      setUpdating(true);
      setError(null);
      console.log(`✏️ Updating ${resourceName} ${id}:`, data);
  
      await service.update(id, data);
      if (!mountedRef.current) return null;
  
      const fullUpdatedItem = await service.getOne(id);
      if (!mountedRef.current) return null;
  
      const processedItem = dataProcessor ? dataProcessor(fullUpdatedItem) : fullUpdatedItem;
  
      setItems(prev => prev.map(item => (item.id === id ? processedItem : item)));
  
      console.log(`✅ ${resourceName} ${id} updated with full data`);
      return processedItem;
  
    } catch (err) {
      if (!mountedRef.current) return null;
      console.error(`❌ Error updating ${resourceName} ${id}:`, err);
      setError(err.message || `Failed to update ${resourceName}`);
      throw err;
    } finally {
      if (mountedRef.current) {
        setUpdating(false);
      }
    }
  }, [service, resourceName, dataProcessor]);

  // ============================================================
  // DELETE ITEM
  // ============================================================
  
  const deleteItem = useCallback(async (id, options = {}) => {
    try {
      setDeleting(true);
      setError(null);

      console.log(`🗑️ Deleting ${resourceName} ${id}`);

      await service.delete(id, options);
      
      if (!mountedRef.current) return;

      // Remove from items array
      setItems(prev => prev.filter(item => item.id !== id));
      
      // Update pagination total
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      console.log(`✅ ${resourceName} ${id} deleted`);

    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error(`❌ Error deleting ${resourceName} ${id}:`, err);
      setError(err.message || `Failed to delete ${resourceName}`);
      throw err;
    } finally {
      if (mountedRef.current) {
        setDeleting(false);
      }
    }
  }, [service, resourceName]);

  // ============================================================
  // DUPLICATE ITEM (if service supports it)
  // ============================================================
  
  const duplicateItem = useCallback(async (id) => {
    try {
      setCreating(true);
      setError(null);

      console.log(`📋 Duplicating ${resourceName} ${id}`);

      // Find original item
      const originalItem = items.find(item => item.id === id);
      if (!originalItem) {
        throw new Error(`${resourceName} not found`);
      }

      // Create duplicate using service if available, or manually
      let duplicatedItem;
      if (service.duplicate) {
        duplicatedItem = await service.duplicate(id);
      } else {
        // Manual duplication - create new item based on original
        const duplicateData = {
          ...originalItem,
          title: `${originalItem.title || 'Untitled'} (Copy)`,
          status: 'draft'
        };
        delete duplicateData.id;
        delete duplicateData.date;
        delete duplicateData.modified;
        
        duplicatedItem = await service.create(duplicateData);
      }
      
      if (!mountedRef.current) return null;

      // Process duplicated item
      const processedItem = dataProcessor 
        ? dataProcessor(duplicatedItem) 
        : duplicatedItem;

      // Add to items array
      setItems(prev => [processedItem, ...prev]);
      
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      console.log(`✅ ${resourceName} ${id} duplicated:`, processedItem.id);
      
      return processedItem;

    } catch (err) {
      if (!mountedRef.current) return null;
      
      console.error(`❌ Error duplicating ${resourceName} ${id}:`, err);
      setError(err.message || `Failed to duplicate ${resourceName}`);
      throw err;
    } finally {
      if (mountedRef.current) {
        setCreating(false);
      }
    }
  }, [service, resourceName, items, dataProcessor]);

  // ============================================================
  // FILTER MANAGEMENT
  // ============================================================
  
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      ...initialFilters
    });
  }, [initialFilters]);

  // ============================================================
  // REFRESH
  // ============================================================
  
  const refresh = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset fetch params to allow refetch
    fetchItems(true);
  }, [fetchItems]);

  // ============================================================
  // AUTO-FETCH WITH DEBOUNCE
  // ============================================================
  
  useEffect(() => {
    // Skip auto-fetch on first render if autoFetch is false
    if (!autoFetch && isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    isFirstRenderRef.current = false;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      fetchItems(true);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [filters, autoFetch, debounceMs, fetchItems]);

  // ============================================================
  // LOAD MORE EFFECT (when currentPage changes)
  // ============================================================
  
  useEffect(() => {
    if (pagination.currentPage > 1) {
      fetchItems(false);
    }
  }, [pagination.currentPage]);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  const computed = useMemo(() => {
    // Use custom calculator if provided
    if (computedValuesCalculator && typeof computedValuesCalculator === 'function') {
      return computedValuesCalculator(items);
    }

    // Default computed values
    return {
      total: items.length,
      published: items.filter(item => item.status === 'publish').length,
      draft: items.filter(item => item.status === 'draft').length,
      private: items.filter(item => item.status === 'private').length
    };
  }, [items, computedValuesCalculator]);

  // ============================================================
  // RETURN
  // ============================================================
  
  return {
    // Data
    items,
    loading,
    creating,
    updating,
    deleting,
    error,
    pagination,
    computed,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    setFilters,

    // Actions
    fetchItems,
    loadMore,
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,
    refresh,

    // Helpers
    hasMore: pagination.hasMore
  };
};

export default useResource;