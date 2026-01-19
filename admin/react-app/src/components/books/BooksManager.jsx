/**
 * BooksManager Component (Redesigned)
 * 
 * Main component for managing books in admin panel.
 * Features: Grid view with cards, slide panel editor, dark mode support.
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 2.0.0
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Book, Loader2, Filter } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Hooks
import useBooks from '../../hooks/useBooks.js';

// Components
import AdminBookCard from './AdminBookCard';
import BookEditorModal from './BookEditorModal';

/**
 * BooksManager Component
 * 
 * Provides full CRUD functionality for book management with:
 * - Grid view with responsive cards
 * - Search and status filtering
 * - Slide panel editor for create/edit
 * - Dark mode support following TestsPage patterns
 */
const BooksManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // --- STATE MANAGEMENT ---
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'

  // --- DATA FETCHING ---
  const booksHook = useBooks({
    autoFetch: true,
    perPage: 50,
    debounceMs: 300
  });

  // --- COLORS (unified with MessagesManager pattern) ---
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgPage: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    // Unified design tokens
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  }), [getColor, isDarkMode]);

  // --- UI HANDLERS ---
  
  const handleSelectBook = (book) => {
    setSelectedBookId(book.id);
    setMode('edit');
    setIsPanelOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedBookId(null);
    setMode('create');
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setSelectedBookId(null);
      setMode('view');
    }, 300); // Wait for animation
  };

  const handleSave = async (bookData) => {
    try {
      if (mode === 'create') {
        await booksHook.createBook(bookData);
      } else {
        await booksHook.updateBook(selectedBookId, bookData);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      throw error;
    }
  };

  const handleDelete = async (bookId) => {
    try {
      await booksHook.deleteBook(bookId);
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  };

  // --- FILTER OPTIONS ---
  const statusOptions = useMemo(() => [
    { value: 'publish,draft', label: t('books.allStatus', 'Todos') },
    { value: 'publish', label: t('common.published', 'Publicados') },
    { value: 'draft', label: t('common.draft', 'Borradores') },
  ], [t]);

  // --- RENDERING ---
  const isInitialLoading = !booksHook.filters || !booksHook.pagination;

  return (
    <div 
      className="flex flex-col h-[calc(100vh-100px)] relative" 
      style={{ backgroundColor: pageColors.bgPage }}
    >
      {/* TOP BAR - Unified with MessagesManager */}
      <div 
        className="flex items-center justify-between px-6 py-4" 
        style={{ 
          backgroundColor: pageColors.bgCard, 
          borderBottom: `1px solid ${pageColors.cardBorder}`,
          boxShadow: pageColors.shadowSm
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="p-2.5 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
              boxShadow: `0 4px 12px ${pageColors.accentGlow}`
            }}
          >
            <Book size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: pageColors.text }}>
              {t('books.title', 'Libros')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: pageColors.textMuted }}>
              {booksHook.pagination?.total || 0} {t('books.totalBooks', 'libros en total')}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleCreateNew}
          disabled={booksHook.loading && mode === 'create'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          style={{ 
            background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
            color: '#fff',
            boxShadow: `0 4px 12px ${pageColors.accentGlow}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 6px 20px ${pageColors.accentGlow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 4px 12px ${pageColors.accentGlow}`;
          }}
        >
          <Plus size={18} />
          <span>{t('books.createBook', 'Nuevo libro')}</span>
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden p-4">
        <div 
          className="h-full rounded-2xl overflow-hidden flex flex-col"
          style={{ 
            backgroundColor: pageColors.bgCard,
            boxShadow: pageColors.shadow,
            border: `1px solid ${pageColors.cardBorder}`
          }}
        >
          {/* Search & Filters Bar */}
          <div 
            className="flex flex-col sm:flex-row gap-3 p-4"
            style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}
          >
            {/* Search Input */}
            <div className="relative flex-1">
              <Search 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: pageColors.textMuted }}
              />
              <input
                type="text"
                value={booksHook.filters?.search || ''}
                onChange={(e) => booksHook.updateFilter?.('search', e.target.value)}
                placeholder={t('books.searchPlaceholder', 'Buscar libros...')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.cardBorder}`,
                  color: pageColors.text,
                  '--tw-ring-color': pageColors.accent
                }}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} style={{ color: pageColors.textMuted }} />
              <select
                value={booksHook.filters?.status || 'publish,draft'}
                onChange={(e) => booksHook.updateFilter?.('status', e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all min-w-[140px]"
                style={{ 
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.cardBorder}`,
                  color: pageColors.text,
                  '--tw-ring-color': pageColors.accent
                }}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: pageColors.bgPage }}>
            {isInitialLoading ? (
              // Initial Loading State
              <div className="flex items-center justify-center py-20">
                <Loader2 
                  className="w-8 h-8 animate-spin" 
                  style={{ color: pageColors.accent }} 
                />
              </div>
            ) : booksHook.computed?.isEmpty && !booksHook.computed?.isFiltered ? (
              // Empty State - No books at all
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: pageColors.hoverBg }}
                >
                  <Book size={36} style={{ color: pageColors.textMuted, opacity: 0.5 }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: pageColors.text }}>
                  {t('books.emptyState', 'No hay libros creados')}
                </h3>
                <p className="text-sm mb-6 max-w-sm" style={{ color: pageColors.textMuted }}>
                  {t('books.emptyStateDescription', 'Comienza creando tu primer libro para que los usuarios puedan acceder a él.')}
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{ 
                    background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
                    color: '#fff',
                    boxShadow: `0 4px 12px ${pageColors.accentGlow}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={18} />
                  {t('books.createFirst', 'Crear el primer libro')}
                </button>
              </div>
            ) : booksHook.computed?.isEmpty && booksHook.computed?.isFiltered ? (
              // Empty State - No results
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: pageColors.hoverBg }}
                >
                  <Search size={36} style={{ color: pageColors.textMuted, opacity: 0.5 }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: pageColors.text }}>
                  {t('books.noResults', 'Sin resultados')}
                </h3>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>
                  {t('books.noResultsDescription', 'No se encontraron libros con los filtros actuales.')}
                </p>
              </div>
            ) : (
              // Books Grid
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {booksHook.books.map(book => (
                    <AdminBookCard
                      key={book.id}
                      book={book}
                      onEdit={handleSelectBook}
                    />
                  ))}
                </div>

                {/* Load More */}
                {booksHook.computed?.hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => booksHook.loadMore?.()}
                      disabled={booksHook.loading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                      style={{ 
                        backgroundColor: pageColors.inputBg,
                        border: `1px solid ${pageColors.cardBorder}`,
                        color: pageColors.text,
                        boxShadow: pageColors.shadowSm
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = pageColors.inputBg;
                      }}
                    >
                      {booksHook.loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t('common.loading', 'Cargando...')}
                        </>
                      ) : (
                        t('common.loadMore', 'Cargar más')
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal - Contained within BooksManager */}
      <BookEditorModal
        isOpen={isPanelOpen}
        bookId={selectedBookId}
        mode={mode}
        onSave={handleSave}
        onClose={handleClosePanel}
        onDelete={handleDelete}
        getBook={booksHook.getBook}
      />
    </div>
  );
};

export default BooksManager;
