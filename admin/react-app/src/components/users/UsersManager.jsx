import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { CheckSquare, Square, ChevronDown } from 'lucide-react';

// Hooks
import { useUsers } from '../../hooks/useUsers.js';
import { useCourses } from '../../hooks/useCourses.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Components
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar';
import UserListItem from './UserListItem';
import UserEditorPanel from './UserEditorPanel';
import UserEnrollmentPanel from './UserEnrollmentPanel';
import UserProgressPanel from './UserProgressPanel';
import BatchEnrollmentModal from './BatchEnrollmentModal';

const UsersManager = () => {
  const { t } = useTranslation();

  // --- ESTADO PRINCIPAL: GESTIÓN DE LA PILA DE PANELES ---
  const [panelStack, setPanelStack] = useState([{ type: 'userList' }]);
  
  // --- ESTADO DE BATCH ACTIONS ---
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [showBatchEnrollModal, setShowBatchEnrollModal] = useState(false);
  const [showBatchActionsMenu, setShowBatchActionsMenu] = useState(false);
  
  // --- REFS ---
  const batchActionsMenuRef = useRef(null);

  // --- HOOKS DE DATOS ---
  const usersHook = useUsers({ 
    autoFetch: true, 
    perPage: 50,
    debounceMs: 300 // Reducir el debounce para búsqueda más responsiva
  });
  const coursesHook = useCourses({ 
    autoFetch: true,
    status: 'publish,draft,private' // 🎯 Admin: mostrar todos los estados
  });
  const { options: taxonomyOptions, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category']);

  // --- EFFECTS ---
  // Cerrar el menú de batch actions cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (batchActionsMenuRef.current && !batchActionsMenuRef.current.contains(event.target)) {
        setShowBatchActionsMenu(false);
      }
    };

    if (showBatchActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBatchActionsMenu]);

  // --- MANEJADORES DE LA PILA DE PANELES ---
  const handleOpenUserPanel = (user) => {
    setPanelStack([{ type: 'userList' }, { type: 'user', id: user.id }]);
  };

  const handleCreateNewUser = () => {
    setPanelStack([{ type: 'userList' }, { type: 'user', id: 'new' }]);
  };

  const handleClosePanel = () => {
    setPanelStack(prev => prev.slice(0, -1));
  };
  
  const handleShowEnrollments = (userId) => {
    setPanelStack(prev => [...prev, { type: 'enrollment', userId: userId }]);
  };

  const handleShowProgress = (userId) => {
    setPanelStack(prev => [...prev, { type: 'progress', userId: userId }]);
  };

  // --- BATCH ACTIONS HANDLERS ---
  const handleToggleUserSelection = useCallback((userId, isSelected) => {
    setSelectedUserIds(prev => {
      if (isSelected) {
        return [...prev, userId];
      } else {
        return prev.filter(id => id !== userId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((isSelected) => {
    if (isSelected) {
      // Seleccionar solo los usuarios filtrados actualmente visibles
      const visibleUserIds = (usersHook.users || []).map(user => user.id);
      setSelectedUserIds(visibleUserIds);
    } else {
      setSelectedUserIds([]);
    }
  }, [usersHook.users]);

  const handleBatchEnroll = useCallback(() => {
    if (selectedUserIds.length === 0) {
      alert('Please select at least one user');
      return;
    }
    setShowBatchEnrollModal(true);
  }, [selectedUserIds]);

  const handleBatchEnrollSubmit = useCallback(async (courseIds) => {
    if (!courseIds || courseIds.length === 0) {
      alert('Please select at least one course');
      return;
    }

    try {
      console.log('🚀 Starting batch enrollment:', {
        users: selectedUserIds,
        courses: courseIds
      });

      // Importar la función de batch enrollment
      const { batchEnrollUsers } = await import('../../api/services/userEnrollmentService.js');

      // Por cada curso, inscribir todos los usuarios seleccionados
      const results = [];
      for (const courseId of courseIds) {
        const result = await batchEnrollUsers(selectedUserIds, parseInt(courseId));
        results.push({
          courseId,
          ...result
        });
      }

      // Mostrar resultados
      const totalSuccess = results.reduce((sum, r) => sum + r.success.length, 0);
      const totalFailed = results.reduce((sum, r) => sum + r.failed.length, 0);

      alert(`Batch enrollment completed!\n\nSuccess: ${totalSuccess}\nFailed: ${totalFailed}`);

      // Limpiar selección y cerrar modal
      setSelectedUserIds([]);
      setShowBatchEnrollModal(false);

      // Refrescar datos
      usersHook.refreshUsers?.();

    } catch (error) {
      console.error('❌ Error in batch enrollment:', error);
      alert('An error occurred during batch enrollment. Please try again.');
    }
  }, [selectedUserIds, usersHook]);

  // --- CONFIGS PARA COMPONENTES HIJO ---
  const roleOptions = useMemo(() => [
    { value: 'all', label: 'All Roles' },
    { value: 'administrator', label: 'Administrator' },
    { value: 'editor', label: 'Editor' },
    { value: 'author', label: 'Author' },
    { value: 'contributor', label: 'Contributor' },
    { value: 'subscriber', label: 'Subscriber' }
  ], []);

  const courseOptionsForEnrollments = useMemo(() => {
    if (!coursesHook.courses || !Array.isArray(coursesHook.courses)) {
      return [];
    }
    
    return coursesHook.courses.map(c => ({ 
      value: c.id.toString(), 
      label: c.title?.rendered || c.title || 'Untitled Course'
    }));
  }, [coursesHook.courses]);

  const searchConfig = useMemo(() => ({
    value: usersHook.filters?.search || '',
    onChange: (e) => {
      const newValue = e.target.value;
      // Actualizar el filtro
      usersHook.setFilters?.(prev => ({ ...prev, search: newValue }));
    },
    placeholder: 'Search users...',
    isLoading: usersHook.loading,
  }), [usersHook.filters, usersHook.loading, usersHook.setFilters]);

  const filtersConfig = useMemo(() => {
    if (!usersHook.filters) return [];
    return [
      {
        label: 'Role',
        value: usersHook.filters.role || 'all',
        onChange: (value) => {
          usersHook.setFilters?.(prev => ({ ...prev, role: value === 'all' ? null : value }));
        },
        options: roleOptions,
        isLoading: false,
      },
      {
        label: 'Course',
        value: usersHook.filters.courseId || 'all',
        onChange: (value) => {
          usersHook.setFilters?.(prev => ({ ...prev, courseId: value === 'all' ? null : value }));
        },
        options: [{ value: 'all', label: 'All Courses' }, ...courseOptionsForEnrollments],
        isLoading: coursesHook.loading,
      },
    ];
  }, [usersHook.filters, usersHook.setFilters, roleOptions, courseOptionsForEnrollments, coursesHook.loading]);

  // --- COMPUTED: Verificar si todos los usuarios visibles están seleccionados ---
  const allVisibleSelected = useMemo(() => {
    const visibleUserIds = (usersHook.users || []).map(user => user.id);
    return visibleUserIds.length > 0 && visibleUserIds.every(id => selectedUserIds.includes(id));
  }, [usersHook.users, selectedUserIds]);

  // --- LÓGICA DE RENDERIZADO ---
  const isInitialLoading = !usersHook.filters || !usersHook.computed;
  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading...</p></div>;
  }

  const panelWidths = {
    1: ['24%'],
    2: ['24%', '72%'],
    3: ['20%', '12%', '64%'],
    4: ['18%', '10%', '10%', '58%']
  };
  const widths = panelWidths[panelStack.length] || panelWidths[4];

  const renderPanel = (panel, index) => {
    const isLastPanel = index === panelStack.length - 1;
    const isCollapsed = !isLastPanel;

    switch(panel.type) {
      case 'userList':
        return (
          <ListPanel
            title="Users"
            itemCount={usersHook.pagination?.total || usersHook.computed.totalUsers || 0}
            createButtonText="Add User"
            onCreate={handleCreateNewUser}
            isCreating={usersHook.updating}
            filters={
              <>
                {/* Batch Actions Bar */}
                <div className="mb-3 flex items-center justify-between gap-2 bg-gray-50 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectAll(!allVisibleSelected)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
                      title={allVisibleSelected ? "Deselect all filtered users" : "Select all filtered users"}
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span className="text-xs">
                        {selectedUserIds.length > 0 ? `${selectedUserIds.length} selected` : 'Select all'}
                      </span>
                    </button>
                  </div>

                  <div className="relative" ref={batchActionsMenuRef}>
                    <button
                      onClick={() => setShowBatchActionsMenu(!showBatchActionsMenu)}
                      disabled={selectedUserIds.length === 0}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Actions
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    
                    {showBatchActionsMenu && selectedUserIds.length > 0 && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowBatchActionsMenu(false);
                            handleBatchEnroll();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Batch Enrollment
                        </button>
                        {/* Aquí se pueden agregar más acciones en el futuro */}
                      </div>
                    )}
                  </div>
                </div>
                
                <FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />
              </>
            }
            onLoadMore={usersHook.loadMoreUsers}
            hasMore={usersHook.hasMore}
            isLoadingMore={usersHook.loading && usersHook.users.length > 0}
          >
            {(usersHook.users || []).map(user => (
              <UserListItem 
                key={user.id} 
                user={user} 
                isSelected={panelStack[1]?.id === user.id}
                isChecked={selectedUserIds.includes(user.id)}
                onClick={handleOpenUserPanel}
                onToggleSelect={handleToggleUserSelection}
                onShowEnrollments={handleShowEnrollments}
                onShowProgress={handleShowProgress}
              />
            ))}
          </ListPanel>
        );
      case 'user':
        return (
          <UserEditorPanel
            key={panel.id}
            userId={panel.id === 'new' ? null : panel.id}
            mode={panel.id === 'new' ? 'create' : 'edit'}
            onSave={panel.id === 'new' ? usersHook.createUser : (data) => usersHook.updateUser(panel.id, data)}
            onCancel={handleClosePanel}
            onShowEnrollments={() => handleShowEnrollments(panel.id)}
            onShowProgress={() => handleShowProgress(panel.id)}
            isCollapsed={isCollapsed}
            roleOptions={roleOptions.filter(opt => opt.value !== 'all')}
          />
        );
      case 'enrollment':
        return (
          <UserEnrollmentPanel
            key={panel.userId}
            userId={panel.userId}
            onCancel={handleClosePanel}
            availableCourses={courseOptionsForEnrollments}
            onEnrollUser={usersHook.enrollUserInCourse}
            onUnenrollUser={usersHook.unenrollUserFromCourse}
            isCollapsed={isCollapsed}
          />
        );
      case 'progress':
        return (
          <UserProgressPanel
            key={panel.userId}
            userId={panel.userId}
            onCancel={handleClosePanel}
            availableCourses={courseOptionsForEnrollments}
            isCollapsed={isCollapsed}
          />
        );
      default:
        return null;
    }
  }

  return (
    <>
      <div className="qe-lms-admin-app h-full flex overflow-x-auto px-4 py-6 space-x-4 min-w-full">
        {panelStack.map((panel, index) => {
          const isLastPanel = index === panelStack.length - 1;
          
          return (
            <div 
              key={`${panel.type}-${panel.id || panel.userId}-${index}`}
              className="transition-all duration-300 ease-in-out h-full flex-shrink-0"
              style={{ 
                width: widths[index],
                minWidth: isLastPanel ? '320px' : index === 0 ? '240px' : '120px' // Columnas compactadas muy estrechas
              }}
            >
              {renderPanel(panel, index)}
            </div>
          );
        })}
      </div>

      {/* Batch Enrollment Modal */}
      {showBatchEnrollModal && (
        <BatchEnrollmentModal
          selectedUserIds={selectedUserIds}
          availableCourses={courseOptionsForEnrollments}
          onSubmit={handleBatchEnrollSubmit}
          onClose={() => setShowBatchEnrollModal(false)}
        />
      )}
    </>
  );
};

export default UsersManager;