import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

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

const UsersManager = () => {
  const { t } = useTranslation();

  // --- ESTADO PRINCIPAL: GESTIÓN DE LA PILA DE PANELES ---
  const [panelStack, setPanelStack] = useState([{ type: 'userList' }]);

  // --- HOOKS DE DATOS ---
  const usersHook = useUsers({ autoFetch: true, perPage: 50 });
  const coursesHook = useCourses({ autoFetch: true });
  const { options: taxonomyOptions, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category']);

  // --- MANEJADORES DE LA PILA DE PANELES ---
  const handleSelectUser = (user) => {
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
    onChange: (e) => usersHook.updateFilter('search', e.target.value),
    placeholder: 'Search users...',
    isLoading: usersHook.loading,
  }), [usersHook.filters, usersHook.loading]);

  const filtersConfig = useMemo(() => {
    if (!usersHook.filters) return [];
    return [
      {
        label: 'Role',
        value: usersHook.filters.role || 'all',
        onChange: (value) => usersHook.updateFilter('role', value),
        options: roleOptions,
        isLoading: false,
      },
      {
        label: 'Course',
        value: usersHook.filters.courseId || 'all',
        onChange: (value) => usersHook.updateFilter('courseId', value),
        options: [{ value: 'all', label: 'All Courses' }, ...courseOptionsForEnrollments],
        isLoading: coursesHook.loading,
      },
    ];
  }, [usersHook.filters, roleOptions, courseOptionsForEnrollments, coursesHook.loading]);

  // --- LÓGICA DE RENDERIZADO ---
  const isInitialLoading = !usersHook.filters || !usersHook.computed;
  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading...</p></div>;
  }

  const panelWidths = {
    1: ['24%'],
    2: ['24%', '72%'],
    3: ['24%', '32%', '40%'],
    4: ['24%', '24%', '24%', '24%']
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
            itemCount={usersHook.computed.totalUsers || 0}
            createButtonText="Add User"
            onCreate={handleCreateNewUser}
            isCreating={usersHook.updating}
            filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
          >
            {(usersHook.users || []).map(user => (
              <UserListItem 
                key={user.id} 
                user={user} 
                isSelected={panelStack[1]?.id === user.id} 
                onClick={handleSelectUser}
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
    <div className="qe-lms-admin-app h-full flex overflow-x-auto px-4 py-6 space-x-4 min-w-full">
      {panelStack.map((panel, index) => (
        <div 
          key={`${panel.type}-${panel.id || panel.userId}-${index}`}
          className="transition-all duration-300 ease-in-out h-full flex-shrink-0"
          style={{ 
            width: widths[index],
            minWidth: index === 0 ? '280px' : '320px' // Ancho mínimo para cada panel
          }}
        >
          {renderPanel(panel, index)}
        </div>
      ))}
    </div>
  );
};

export default UsersManager;