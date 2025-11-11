import React, { useEffect } from 'react';
import { X, Trophy, TrendingUp, Users, Award, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useCourseRanking } from '../../hooks/useCourseRanking';

const CourseRankingModal = ({ isOpen, onClose, courseId, courseName }) => {
    const {
        loading,
        error,
        ranking,
        statistics,
        myStats,
        pagination,
        withRisk,
        toggleRisk,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        goToUserPage
    } = useCourseRanking(courseId);

    useEffect(() => {
        // When modal opens, go to user's page if available
        if (isOpen && pagination.userPage && pagination.currentPage === 1) {
            goToUserPage();
        }
    }, [isOpen, pagination.userPage, pagination.currentPage, goToUserPage]);

    if (!isOpen) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const totalPages = pagination.totalPages;
        const currentPage = pagination.currentPage;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (currentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        i === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    {i}
                </button>
            );
        }
        
        return pages;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-md">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Ranking del Curso</h2>
                            <p className="text-sm text-gray-600">{courseName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading && !ranking.length ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Cargando ranking...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                            <p className="font-medium">Error al cargar el ranking</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Statistics Section */}
                            {statistics && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Total Users */}
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500 rounded-lg">
                                                <Users className="w-5 h-5 text-white" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{statistics.total_users}</p>
                                    </div>

                                    {/* Course Average Without Risk */}
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-green-500 rounded-lg">
                                                <TrendingUp className="w-5 h-5 text-white" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-600">Media Sin Riesgo</p>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {(statistics.avg_score_without_risk ?? 0).toFixed(2)}
                                        </p>
                                    </div>

                                    {/* Course Average With Risk */}
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-yellow-500 rounded-lg">
                                                <Award className="w-5 h-5 text-white" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-600">Media Con Riesgo</p>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {(statistics.avg_score_with_risk ?? 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* User's Statistics */}
                            {myStats && (
                                <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg p-6 border border-amber-200 shadow-md">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-600" />
                                        Tus Estadísticas
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Without Risk */}
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
                                                Sin Riesgo
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Puntuación:</span>
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {(myStats.score_without_risk ?? 0).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Posición:</span>
                                                    <span className="text-sm font-bold text-blue-600">
                                                        #{myStats.position_without_risk ?? '-'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Percentil:</span>
                                                    <span className={`text-sm font-bold ${
                                                        (myStats.percentile_without_risk ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {(myStats.percentile_without_risk ?? 0) > 0 ? '+' : ''}{(myStats.percentile_without_risk ?? 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* With Risk */}
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
                                                Con Riesgo
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Puntuación:</span>
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {(myStats.score_with_risk ?? 0).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Posición:</span>
                                                    <span className="text-sm font-bold text-blue-600">
                                                        #{myStats.position_with_risk ?? '-'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Percentil:</span>
                                                    <span className={`text-sm font-bold ${
                                                        (myStats.percentile_with_risk ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {(myStats.percentile_with_risk ?? 0) > 0 ? '+' : ''}{(myStats.percentile_with_risk ?? 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Toggle Risk Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={toggleRisk}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                                        withRisk 
                                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                                >
                                    {withRisk ? 'Con Riesgo' : 'Sin Riesgo'}
                                </button>
                            </div>

                            {/* Ranking Table */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Posición
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Usuario
                                                </th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Puntuación
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {ranking.map((user) => {
                                                const isCurrentUser = user.is_current_user;
                                                const positionColor = 
                                                    user.position === 1 ? 'text-yellow-600 font-bold' :
                                                    user.position === 2 ? 'text-gray-500 font-bold' :
                                                    user.position === 3 ? 'text-orange-600 font-bold' :
                                                    'text-gray-700';

                                                return (
                                                    <tr
                                                        key={user.user_id}
                                                        className={`transition-colors ${
                                                            isCurrentUser
                                                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                {user.position === 1 && (
                                                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                                                )}
                                                                {user.position === 2 && (
                                                                    <Award className="w-5 h-5 text-gray-400" />
                                                                )}
                                                                {user.position === 3 && (
                                                                    <Award className="w-5 h-5 text-orange-500" />
                                                                )}
                                                                <span className={`text-lg font-semibold ${positionColor}`}>
                                                                    #{user.position}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={user.avatar_url}
                                                                    alt={user.display_name}
                                                                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                                                                />
                                                                <div>
                                                                    <p className={`font-medium ${
                                                                        isCurrentUser ? 'text-blue-700' : 'text-gray-900'
                                                                    }`}>
                                                                        {user.display_name}
                                                                        {isCurrentUser && (
                                                                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                                                                Tú
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {user.total_attempts} intento{user.total_attempts !== 1 ? 's' : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`text-lg font-bold ${
                                                                isCurrentUser ? 'text-blue-700' : 'text-gray-900'
                                                            }`}>
                                                                {(user.score ?? 0).toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {ranking.length === 0 && !loading && (
                                    <div className="text-center py-12">
                                        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">No hay usuarios en el ranking todavía</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            Completa todos los cuestionarios para aparecer en el ranking
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="text-sm text-gray-600">
                                        Mostrando {((pagination.currentPage - 1) * pagination.perPage) + 1} - {Math.min(pagination.currentPage * pagination.perPage, pagination.totalUsers)} de {pagination.totalUsers} usuarios
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={firstPage}
                                            disabled={pagination.currentPage === 1}
                                            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Primera página"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={prevPage}
                                            disabled={pagination.currentPage === 1}
                                            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Anterior"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="flex gap-1">
                                            {renderPageNumbers()}
                                        </div>
                                        
                                        <button
                                            onClick={nextPage}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Siguiente"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={lastPage}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Última página"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer con botón de cerrar */}
                <div className="p-4 border-t border-gray-200 flex justify-center bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseRankingModal;
