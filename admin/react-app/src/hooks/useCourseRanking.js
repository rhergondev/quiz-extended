import { useState, useEffect, useCallback, useRef } from 'react';
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
        perPage: 10,
        totalUsers: 0,
        userPage: null
    });
    const [withRisk, setWithRisk] = useState(false);
    const [myStatus, setMyStatus] = useState(null);
    const [statisticsLoaded, setStatisticsLoaded] = useState(false);
    const requestIdRef = useRef(0);

    const fetchRanking = useCallback(async (page = null, loadStatistics = false) => {
        if (!courseId) return;

        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);

        try {
            const result = await getCourseRanking(courseId, {
                page: page || pagination.currentPage,
                perPage: pagination.perPage,
                withRisk
            });

            // Ignore stale responses from superseded requests
            if (requestId !== requestIdRef.current) return;

            if (result.success) {
                setRanking(result.data.ranking || []);

                if (loadStatistics || !statisticsLoaded) {
                    setStatistics(result.data.statistics || null);
                    setStatisticsLoaded(true);
                }

                setMyStats(result.data.my_stats || null);

                // Only update metadata from API, keep currentPage from local navigation state
                const apiPagination = result.data.pagination || {};
                setPagination(prev => ({
                    ...prev,
                    totalPages: apiPagination.total_pages || 0,
                    perPage: apiPagination.per_page || prev.perPage,
                    totalUsers: apiPagination.total_users || 0,
                    userPage: apiPagination.user_page || null
                }));
            } else {
                setError(result.message || 'Failed to load ranking');
            }
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            console.error('Error fetching course ranking:', err);
            setError(err.message || 'An error occurred while loading the ranking');
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
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
    }, []);

    // All navigation functions use functional setPagination so they never
    // capture stale closure values and have stable (empty) deps.
    const goToPage = useCallback((page) => {
        setPagination(prev => {
            if (page < 1 || (prev.totalPages > 0 && page > prev.totalPages)) return prev;
            if (page === prev.currentPage) return prev;
            return { ...prev, currentPage: page };
        });
    }, []);

    const nextPage = useCallback(() => {
        setPagination(prev => {
            if (prev.currentPage >= prev.totalPages) return prev;
            return { ...prev, currentPage: prev.currentPage + 1 };
        });
    }, []);

    const prevPage = useCallback(() => {
        setPagination(prev => {
            if (prev.currentPage <= 1) return prev;
            return { ...prev, currentPage: prev.currentPage - 1 };
        });
    }, []);

    const firstPage = useCallback(() => {
        setPagination(prev => {
            if (prev.currentPage === 1) return prev;
            return { ...prev, currentPage: 1 };
        });
    }, []);

    const lastPage = useCallback(() => {
        setPagination(prev => {
            if (prev.totalPages === 0 || prev.currentPage === prev.totalPages) return prev;
            return { ...prev, currentPage: prev.totalPages };
        });
    }, []);

    const goToUserPage = useCallback(() => {
        setPagination(prev => {
            if (!prev.userPage || prev.currentPage === prev.userPage) return prev;
            return { ...prev, currentPage: prev.userPage };
        });
    }, []);

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
