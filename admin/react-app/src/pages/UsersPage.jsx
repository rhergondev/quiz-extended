import React, { useState, useMemo, useCallback } from 'react';
import { Users, UserPlus } from 'lucide-react';
import useUsers from '../hooks/useUsers.js';
import UserCard from '../components/users/UserCard.jsx';
import ContentManager from '../components/common/ContentManager.jsx';
import FakeUserGenerator from '../components/users/FakeUserGenerator.jsx';

const UsersPage = () => {
  const [isFakeUserModalOpen, setIsFakeUserModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ role: '' });
  const [sortOrder, setSortOrder] = useState('asc');

  const {
    users,
    isLoading,
    error,
    totalPages,
    totalUsers,
    fetchUsers,
    deleteUser,
    updateUser,
    createUser
  } = useUsers();

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((order) => {
    setSortOrder(order);
    setPage(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const onSelectUser = (userId, isSelected) => {
    setSelectedUsers(prev =>
      isSelected ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const memoizedUsers = useMemo(() => users, [users]);

  const filterOptions = [
    {
      id: 'role',
      name: 'Rol',
      options: [
        { value: '', label: 'Todos los roles' },
        { value: 'subscriber', label: 'Suscritor' },
        { value: 'editor', label: 'Editor' },
        { value: 'author', label: 'Autor' },
        { value: 'contributor', label: 'Colaborador' },
        { value: 'administrator', label: 'Administrador' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">Administra usuarios, inscripciones y permisos.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsFakeUserModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              <Users className="h-4 w-4 mr-2" />
              Generar Usuarios Ficticios
            </button>
            <button
              onClick={() => alert('Funcionalidad de "Añadir Usuario" pendiente de implementación.')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Añadir Usuario
            </button>
          </div>
        </div>

        <ContentManager
          resourceType="user"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          items={memoizedUsers}
          isLoading={isLoading}
          error={error}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          filterOptions={filterOptions}
          pagination={{ currentPage: page, totalPages, onPageChange: handlePageChange }}
          renderGridItem={(user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelected={selectedUsers.includes(user.id)}
              onSelect={onSelectUser}
            />
          )}
          // Aquí iría la prop renderTableItem si se implementa la vista de tabla
        />
      </div>
      
      <FakeUserGenerator 
        isOpen={isFakeUserModalOpen} 
        onClose={() => setIsFakeUserModalOpen(false)} 
      />
    </div>
  );
};

export default UsersPage;