/**
 * BooksManager Component
 * 
 * Main component for managing books (PDFs) with listing and editing capabilities.
 * Includes WooCommerce product linking functionality.
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

// Hooks
import useBooks from '../../hooks/useBooks.js';

// Common Components
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar';

// Specific Components
import BookListItem from './BookListItem';
import BookEditorPanel from './BookEditorPanel';

/**
 * BooksManager Component
 * 
 * Provides full CRUD functionality for book management including:
 * - List view with search and filtering
 * - Create new books
 * - Edit existing books
 * - PDF upload
 * - WooCommerce product linking
 */
const BooksManager = () => {
  const { t } = useTranslation();

  // --- STATE MANAGEMENT ---
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'

  // --- DATA FETCHING ---
  const booksHook = useBooks({
    autoFetch: true,
    perPage: 50,
    debounceMs: 300
  });

  // --- UI HANDLERS ---
  
  /**
   * Handle book selection from list
   */
  const handleSelectBook = (book) => {
    setSelectedBookId(book.id);
    setMode('edit');
  };

  /**
   * Handle create new book
   */
  const handleCreateNew = () => {
    setSelectedBookId(null);
    setMode('create');
  };

  /**
   * Handle cancel editing
   */
  const handleCancel = () => {
    setSelectedBookId(null);
    setMode('view');
  };

  /**
   * Handle save book (create or update)
   */
  const handleSave = async (bookData) => {
    try {
      if (mode === 'create') {
        const newBook = await booksHook.createBook(bookData);
        setSelectedBookId(newBook.id);
        setMode('edit');
      } else {
        await booksHook.updateBook(selectedBookId, bookData);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      throw error; // Re-throw so editor can show error
    }
  };

  /**
   * Handle delete book
   */
  const handleDelete = async (bookId) => {
    try {
      await booksHook.deleteBook(bookId);
      setSelectedBookId(null);
      setMode('view');
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  };

  // --- FILTER CONFIGURATION ---
  
  const statusOptions = useMemo(() => [
    { value: 'publish,draft', label: t('books.allStatus', 'Todos los estados') },
    { value: 'publish', label: t('common.published', 'Publicados') },
    { value: 'draft', label: t('common.draft', 'Borradores') },
  ], [t]);

  const filtersConfig = useMemo(() => {
    if (!booksHook.filters || !booksHook.updateFilter) return [];
    return [
      {
        label: t('common.status', 'Estado'),
        value: booksHook.filters.status || 'publish,draft',
        onChange: (value) => booksHook.updateFilter('status', value),
        options: statusOptions,
        isLoading: false,
      },
    ];
  }, [booksHook.filters, booksHook.updateFilter, statusOptions, t]);

  const searchConfig = useMemo(() => {
    if (!booksHook.filters || !booksHook.updateFilter) {
      return {
        value: '',
        onChange: () => {},
        placeholder: t('books.searchPlaceholder', 'Buscar libros...'),
        isLoading: false,
      };
    }
    return {
      value: booksHook.filters.search || '',
      onChange: (e) => booksHook.updateFilter('search', e.target.value),
      placeholder: t('books.searchPlaceholder', 'Buscar libros...'),
      isLoading: booksHook.loading,
    };
  }, [booksHook.filters, booksHook.updateFilter, booksHook.loading, t]);

  // --- RENDERING ---
  
  const isInitialLoading = !booksHook.filters || !booksHook.pagination;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>{t('common.loading', 'Cargando...')}</p>
      </div>
    );
  }

  const showEditor = mode === 'create' || (mode === 'edit' && selectedBookId);

  return (
    <div className="qe-lms-admin-app h-full flex overflow-hidden px-6">
      {/* Panel 1: Books List */}
      <div className={clsx(
        "transition-all duration-500 ease-in-out h-full flex-shrink-0",
        {
          "w-full lg:w-[30%]": !showEditor,
          "w-[30%]": showEditor,
        }
      )}>
        <ListPanel
          title={t('books.title', 'Libros')}
          itemCount={booksHook.pagination?.total || 0}
          createButtonText={t('books.createBook', 'Crear Libro')}
          onCreate={handleCreateNew}
          isCreating={booksHook.loading && mode === 'create'}
          onLoadMore={booksHook.loadMore}
          hasMore={booksHook.computed.hasMore}
          isLoadingMore={booksHook.loading && booksHook.books.length > 0}
          filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
        >
          {booksHook.computed.isEmpty && !booksHook.computed.isFiltered ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg mb-2">📚</p>
              <p>{t('books.emptyState', 'No hay libros creados todavía.')}</p>
              <button
                onClick={handleCreateNew}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {t('books.createFirst', 'Crear el primer libro')}
              </button>
            </div>
          ) : booksHook.computed.isEmpty && booksHook.computed.isFiltered ? (
            <div className="p-8 text-center text-gray-500">
              <p>{t('books.noResults', 'No se encontraron libros con esos criterios.')}</p>
            </div>
          ) : (
            booksHook.books.map(book => (
              <BookListItem
                key={book.id}
                book={book}
                isSelected={selectedBookId === book.id}
                onClick={handleSelectBook}
              />
            ))
          )}
        </ListPanel>
      </div>

      {/* Panel 2: Book Editor */}
      <div className={clsx(
        "transition-all duration-500 ease-in-out h-full flex-grow ml-6",
        {
          "w-0 ml-0 opacity-0": !showEditor,
          "opacity-100": showEditor,
        }
      )}>
        {showEditor && (
          <BookEditorPanel
            key={selectedBookId || 'new'}
            bookId={selectedBookId}
            mode={mode}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
            getBook={booksHook.getBook}
          />
        )}
      </div>
    </div>
  );
};

export default BooksManager;
