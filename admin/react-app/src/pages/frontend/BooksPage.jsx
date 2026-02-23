/**
 * BooksPage Component
 * 
 * Frontend page for users to view and download their purchased books
 * Follows CoursesPage pattern with dark mode support
 * 
 * @package QuizExtended
 * @subpackage Pages/Frontend
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox, X, BookOpen, FileText, Home, Sun, Moon, User, LogOut, Book, Plus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useUserBooks from '../../hooks/useUserBooks';
import useBooks from '../../hooks/useBooks'; // Added for admin capabilities
import BookCard from '../../components/frontend/BookCard';
import BookEditorModal from '../../components/books/BookEditorModal'; // Replaces BookEditorSlidePanel
import { isUserAdmin } from '../../utils/userUtils';
import { NavLink, useOutletContext } from 'react-router-dom';

/**
 * Page state component for loading/error/empty states
 */
const PageState = ({ icon: Icon, title, message, colors }) => (
  <div className="text-center py-16">
    <Icon className="mx-auto h-12 w-12" style={{ color: colors?.textMuted || '#9ca3af' }} />
    <h3 className="mt-2 text-lg font-semibold" style={{ color: colors?.text || '#111827' }}>{title}</h3>
    <p className="mt-1 text-sm" style={{ color: colors?.textMuted || '#6b7280' }}>{message}</p>
  </div>
);

const BooksPage = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();
  const userIsAdmin = isUserAdmin();
  const { isMobileMenuOpen: isMenuOpen, setIsMobileMenuOpen: setIsMenuOpen } = useOutletContext();
  
  const homeUrl = window.qe_data?.home_url || '';
  const logoutUrl = window.qe_data?.logout_url;

  // Adaptive colors based on mode (same pattern as CoursesPage)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    surface: isDarkMode ? getColor('background', '#111827') : getColor('background', '#ffffff'),
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : getColor('borderColor', '#e5e7eb'),
  };
  
  const { books, loading, error, refresh } = useUserBooks({ autoFetch: true });

  // Admin capabilities
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'

  // Hook specifically for admin operations (CRUD) - autoFetch false as we use it just for actions
  const booksManager = useBooks({ autoFetch: false });

  // Handlers for Admin
  const handleCreateNew = () => {
    setSelectedBookId(null);
    setMode('create');
    setIsPanelOpen(true);
  };

  const handleEditBook = (book) => {
    setSelectedBookId(book.id);
    setMode('edit');
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setSelectedBookId(null);
      setMode('view');
    }, 300);
  };

  const handleSave = async (bookData) => {
    try {
      if (mode === 'create') {
        await booksManager.createBook(bookData);
      } else {
        await booksManager.updateBook(selectedBookId, bookData);
      }
      // Refresh user books list to show changes
      refresh();
    } catch (error) {
      console.error('Error saving book:', error);
      throw error;
    }
  };

  const handleDelete = async (bookId) => {
    try {
      await booksManager.deleteBook(bookId);
      handleClosePanel();
      // Refresh user books list to show changes
      refresh();
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  };

  const isBookAvailableForUser = (book) => {
    const start = book.start_date || book.meta?._book_start_date;
    const end = book.end_date || book.meta?._book_end_date;
    const now = new Date();

    if (start) {
      const startDate = new Date(start);
      if (!Number.isNaN(startDate.getTime()) && now < startDate) {
        return false;
      }
    }

    if (end) {
      const endDate = new Date(end);
      if (!Number.isNaN(endDate.getTime()) && now > endDate) {
        return false;
      }
    }

    return true;
  };

  const visibleBooks = userIsAdmin ? books : books.filter(isBookAvailableForUser);

  const renderContent = () => {
    if (loading && visibleBooks.length === 0) {
      return (
        <PageState 
          icon={Loader} 
          title={t('books.loadingBooks')} 
          message={t('common.processing')}
          colors={pageColors}
        />
      );
    }
  
    if (error) {
      return (
        <PageState 
          icon={AlertTriangle} 
          title={t('notifications.error')} 
          message={error}
          colors={pageColors}
        />
      );
    }
    
    if (!visibleBooks || visibleBooks.length === 0) {
      return (
        <div className="flex flex-col items-center">
          <PageState 
            icon={Inbox} 
            title={t('books.noBooks')} 
            message={t('books.noBooksDescription')}
            colors={pageColors}
          />
          {userIsAdmin && (
            <button
              onClick={handleCreateNew}
              className="mt-4 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2"
              style={{
                backgroundColor: pageColors.primary,
                color: '#ffffff',
                boxShadow: `0 4px 10px ${pageColors.primary}30`
              }}
            >
              <Plus size={18} />
              <span>{t('books.createFirst', 'Crear el primer libro')}</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleBooks.map(book => (
          <BookCard 
            key={book.id} 
            book={book} 
            isAdmin={userIsAdmin}
            onEdit={handleEditBook}
          />
        ))}
      </div>
    );
  };

  const menuItems = [
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: BookOpen, type: 'internal' },
    { to: '/books', text: t('sidebar.books'), icon: Book, type: 'internal' },
    { to: homeUrl, text: t('sidebar.exitCampus'), icon: Home, type: 'exit' },
  ];

  return (
    <div 
      className="h-full w-full overflow-y-auto p-6" 
      style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
    >
      {/* Menu overlay */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsMenuOpen(false)}
          />
          
          <div 
            className="fixed top-0 right-0 h-full w-80 z-50 shadow-2xl overflow-y-auto"
            style={{ backgroundColor: getColor('background', '#ffffff') }}
          >
            {/* Menu header */}
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')
            }}>
              <h2 className="text-xl font-bold" style={{ color: pageColors.text }}>
                {t('sidebar.menu')}
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: pageColors.text }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu options */}
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                if (item.type === 'exit') {
                  return (
                    <a
                      key={item.to}
                      href={item.to}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                      style={{
                        backgroundColor: 'transparent',
                        color: pageColors.text
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.text}</span>
                    </a>
                  );
                }
                
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? pageColors.primary : 'transparent',
                      color: isActive ? '#ffffff' : pageColors.text
                    })}
                    onMouseEnter={(e) => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.text}</span>
                  </NavLink>
                );
              })}

              {/* Separator */}
              <div 
                className="my-4"
                style={{ 
                  height: '1px', 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')
                }}
              />

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                style={{
                  backgroundColor: 'transparent',
                  color: pageColors.text
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{isDarkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
              </button>

              {/* My Account */}
              <a
                href={`${homeUrl}/mi-cuenta/edit-account/`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                style={{
                  backgroundColor: 'transparent',
                  color: pageColors.text
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <User className="w-5 h-5" />
                <span>{t('sidebar.myAccount')}</span>
              </a>

              {/* Logout */}
              {logoutUrl && (
                <a
                  href={logoutUrl}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: pageColors.primary,
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = pageColors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = pageColors.primary;
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('sidebar.logout')}</span>
                </a>
              )}
            </nav>
          </div>
        </>
      )}

      <main>
        {/* Page Header */}
        <div
          className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl p-5"
          style={{
            backgroundColor: pageColors.surface,
            border: `1px solid ${pageColors.border}`
          }}
        >
          <div>
            <h1 
              className="text-2xl font-bold flex items-center gap-3"
              style={{ color: pageColors.text }}
            >
              <Book className="w-8 h-8" style={{ color: pageColors.primary }} />
              {t('books.myBooks')}
            </h1>
            <p 
              className="mt-1 text-sm"
              style={{ color: pageColors.textMuted }}
            >
              {t('books.myBooksDescription')}
            </p>
          </div>

          {/* Admin Action: Create Book */}
          {userIsAdmin && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: pageColors.primary,
                color: '#ffffff',
                boxShadow: `0 4px 10px ${pageColors.primary}30`
              }}
            >
              <Plus size={18} />
              <span>{t('books.createBook', 'Nuevo Libro')}</span>
            </button>
          )}
        </div>

        {renderContent()}
      </main>

      {/* Admin Editor Modal */}
      {userIsAdmin && (
        <BookEditorModal
          isOpen={isPanelOpen}
          bookId={selectedBookId}
          mode={mode}
          onSave={handleSave}
          onClose={handleClosePanel}
          onDelete={handleDelete}
          getBook={booksManager.getBook}
        />
      )}
    </div>
  );
};

export default BooksPage;
