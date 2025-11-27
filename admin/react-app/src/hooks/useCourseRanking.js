import { useState, useEffect, useCallback } from 'react';
import { getCourseRanking, getMyRankingStatus } from '../api/services/courseRankingService';

export const useCourseRanking = (courseId) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [myStats, setMyStats] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        perPage: 10, // Changed to 10 per page for panel view
        totalUsers: 0,
        userPage: null
    });
    const [withRisk, setWithRisk] = useState(false);
    const [myStatus, setMyStatus] = useState(null);
    const [statisticsLoaded, setStatisticsLoaded] = useState(false);

    const fetchRanking = useCallback(async (page = null, loadStatistics = false) => {
        if (!courseId) return;

        setLoading(true);
        setError(null);

        try {
            const result = await getCourseRanking(courseId, {
                page: page || pagination.currentPage,
                perPage: pagination.perPage,
                withRisk
            });

            if (result.success) {
                setRanking(result.data.ranking || []);
                
                // Solo actualizar estadísticas en la primera carga o cuando se solicite explícitamente
                if (loadStatistics || !statisticsLoaded) {
                    setStatistics(result.data.statistics || null);
                    setStatisticsLoaded(true);
                }
                
                setMyStats(result.data.my_stats || null);
                
                // Convert snake_case from API to camelCase
                const apiPagination = result.data.pagination || {};
                setPagination({
                    currentPage: apiPagination.current_page || 1,
                    totalPages: apiPagination.total_pages || 0,
                    perPage: apiPagination.per_page || 10,
                    totalUsers: apiPagination.total_users || 0,
                    userPage: apiPagination.user_page || null
                });
            } else {
                setError(result.message || 'Failed to load ranking');
            }
        } catch (err) {
            console.error('Error fetching course ranking:', err);
            setError(err.message || 'An error occurred while loading the ranking');
        } finally {
            setLoading(false);
        }
    }, [courseId, pagination.currentPage, pagination.perPage, withRisk, statisticsLoaded]);

    const fetchMyStatus = useCallback(async () => {
        if (!courseId) return;

        try {
            const result = await getMyRankingStatus(courseId);
            if (result.success) {
                setMyStatus(result.data || null);
            }
        } catch (err) {
            console.error('Error fetching my ranking status:', err);
        }
    }, [courseId]);

    const toggleRisk = useCallback(() => {
        setWithRisk(prev => !prev);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        // No resetear statisticsLoaded para evitar recargar estadísticas
    }, []);

    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: page }));
        }
    }, [pagination.totalPages]);

    const nextPage = useCallback(() => {
        if (pagination.currentPage < pagination.totalPages) {
            goToPage(pagination.currentPage + 1);
        }
    }, [pagination.currentPage, pagination.totalPages, goToPage]);

    const prevPage = useCallback(() => {
        if (pagination.currentPage > 1) {
            goToPage(pagination.currentPage - 1);
        }
    }, [pagination.currentPage, goToPage]);

    const firstPage = useCallback(() => {
        goToPage(1);
    }, [goToPage]);

    const lastPage = useCallback(() => {
        goToPage(pagination.totalPages);
    }, [pagination.totalPages, goToPage]);

    const goToUserPage = useCallback(() => {
        if (pagination.userPage) {
            goToPage(pagination.userPage);
        }
    }, [pagination.userPage, goToPage]);

    useEffect(() => {
        // En la primera carga, cargar estadísticas
        if (!statisticsLoaded) {
            fetchRanking(null, true);
        } else {
            // En los cambios posteriores, solo recargar la tabla
            fetchRanking();
        }
    }, [courseId, pagination.currentPage, withRisk]);

    useEffect(() => {
        fetchMyStatus();
    }, [fetchMyStatus]);

    return {
        loading,
        error,
        ranking,
        statistics,
        myStats,
        pagination,
        withRisk,
        myStatus,
        fetchRanking,
        toggleRisk,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        goToUserPage,
        refetch: fetchRanking
    };
};

export default useCourseRanking;
