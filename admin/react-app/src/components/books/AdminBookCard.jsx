/**
 * AdminBookCard Component
 * 
 * Card component for displaying a book in the admin grid view.
 * Follows TestsPage styling patterns with dark mode support.
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 1.0.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Edit2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * AdminBookCard Component
 * 
 * @param {Object} props
 * @param {Object} props.book - Book data object
 * @param {Function} props.onEdit - Edit handler
 */
const AdminBookCard = ({ book, onEdit }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // Colors following TestsPage pattern
  const cardColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    hoverBorder: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    statusPublish: '#10b981',
    statusDraft: '#f59e0b',
  };

  const title = book.title?.rendered || book.title || t('books.untitled', 'Sin título');
  const isPublished = book.status === 'publish';
  const hasPdf = book.pdf?.url || book.pdf?.file_id;
  const coverImage = book.featured_image_url || null;

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer"
      style={{
        backgroundColor: cardColors.bgCard,
        border: `1px solid ${cardColors.border}`,
        boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
      }}
      onClick={() => onEdit(book)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = cardColors.hoverBorder;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isDarkMode 
          ? '0 8px 30px rgba(0,0,0,0.4)' 
          : '0 8px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = cardColors.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isDarkMode 
          ? '0 4px 20px rgba(0,0,0,0.3)' 
          : '0 4px 20px rgba(0,0,0,0.08)';
      }}
    >
      {/* Cover Image Area */}
      <div 
        className="aspect-[3/4] w-full relative overflow-hidden"
        style={{ 
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
        }}
      >
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText 
              size={48} 
              style={{ color: cardColors.textMuted, opacity: 0.5 }} 
            />
          </div>
        )}

        {/* Status Badge */}
        <div 
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isPublished ? (
            <>
              <Eye size={12} style={{ color: cardColors.statusPublish }} />
              <span style={{ color: cardColors.statusPublish }}>
                {t('common.published', 'Publicado')}
              </span>
            </>
          ) : (
            <>
              <EyeOff size={12} style={{ color: cardColors.statusDraft }} />
              <span style={{ color: cardColors.statusDraft }}>
                {t('common.draft', 'Borrador')}
              </span>
            </>
          )}
        </div>

        {/* Hover Overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
            style={{
              backgroundColor: cardColors.buttonBg,
              color: cardColors.buttonText,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(book);
            }}
          >
            <Edit2 size={16} />
            {t('common.edit', 'Editar')}
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 
          className="font-semibold text-sm line-clamp-2 mb-2"
          style={{ color: cardColors.text }}
          title={title}
        >
          {title}
        </h3>

        {/* PDF Status */}
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: hasPdf ? cardColors.statusPublish : cardColors.textMuted }} />
          <span 
            className="text-xs"
            style={{ color: hasPdf ? cardColors.statusPublish : cardColors.textMuted }}
          >
            {hasPdf 
              ? t('books.pdfAttached', 'PDF adjunto') 
              : t('books.noPdf', 'Sin PDF')
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminBookCard;
