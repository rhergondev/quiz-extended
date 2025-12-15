/**
 * BookListItem Component
 * 
 * Renders a single book item in the list panel.
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 1.0.0
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

/**
 * BookListItem Component
 * 
 * @param {Object} props
 * @param {Object} props.book - Book object
 * @param {boolean} props.isSelected - Whether this item is selected
 * @param {Function} props.onClick - Click handler
 */
const BookListItem = ({ book, isSelected, onClick }) => {
  const { t } = useTranslation();

  // Get book title safely
  const getBookTitle = (book) => {
    return book?.title?.rendered || book?.title || t('books.untitled', 'Libro sin título');
  };

  const itemClasses = clsx(
    'p-4 cursor-pointer border-l-4 transition-colors duration-150',
    {
      'bg-blue-50 border-blue-600': isSelected,
      'border-transparent hover:bg-gray-50': !isSelected,
    }
  );

  return (
    <div className={itemClasses} onClick={() => onClick(book)}>
      <div className="flex items-center w-full gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-semibold text-gray-900 truncate" 
            title={getBookTitle(book)}
          >
            {getBookTitle(book)}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {book?.pdf?.filename ? (
              <span className="truncate max-w-[150px]" title={book.pdf.filename}>
                📄 {book.pdf.filename}
              </span>
            ) : (
              <span className="text-orange-500">
                {t('books.noPdf', 'Sin PDF')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookListItem;
