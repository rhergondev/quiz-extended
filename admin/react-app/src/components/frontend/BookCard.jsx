/**
 * BookCard Component
 * 
 * Displays a purchasable book card with download functionality
 * Designed for dark mode support following CompactCourseCard pattern
 * 
 * @package QuizExtended
 * @subpackage Components/Frontend
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Book, Download, Loader, Pencil, List, FileText, Calendar, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ChapterDetailsModal = ({ book, onClose, colors }) => {
    const { t } = useTranslation();
    
    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return '';
        }
    };
    
    // Combine full PDF (if exists) + Chapters
    const hasFullPdf = book.pdf && book.pdf.url;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
             <div 
                className="relative w-full max-w-lg rounded-xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in duration-200"
                style={{ backgroundColor: colors.cardBg }}
                onClick={e => e.stopPropagation()}
             >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.disabledBg }}>
                    <h3 className="font-bold text-lg" style={{ color: colors.text }}>{t('books.downloads', 'Descargas Disponibles')}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-700 transition-colors" style={{ backgroundColor: '#111827' }}>
                        <X size={20} className="text-white" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-4 space-y-3">
                     {/* Full Book Option */}
                     {hasFullPdf && (
                         <div className="mb-6">
                             <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>{t('books.fullVersion', 'Libro Completo')}</h4>
                             <a href={book.pdf.url} target="_blank" rel="noopener noreferrer" 
                                className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-blue-50/10 group"
                                style={{ borderColor: colors.borderColor }}
                             >
                                <div className="text-red-500">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" style={{ color: colors.text }}>
                                        {book.pdf.filename || book.title}
                                    </p>
                                    <span className="text-xs" style={{ color: colors.textMuted }}>{t('books.fullPdf', 'PDF Completo')}</span>
                                </div>
                                <Download size={18} style={{ color: colors.primary }} />
                             </a>
                         </div>
                     )}

                     {/* Chapters / Updates */}
                     <div>
                        {hasFullPdf && <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: colors.textMuted }}>{t('books.updates', 'Actualizaciones')}</h4>}
                        
                        <div className="space-y-1">
                            {book.chapters.map((chapter) => (
                                <a 
                                    key={chapter.id}
                                    href={chapter.pdf?.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 group"
                                >
                                    <div className="text-gray-400">
                                        <List size={20} style={{ color: colors.textMuted }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate" style={{ color: colors.text }}>
                                            {chapter.title}
                                        </p>
                                        {chapter.date_added && (
                                            <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: colors.textMuted }}>
                                                <Calendar size={12} />
                                                <span>{formatDate(chapter.date_added)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500">
                                        <Download size={14} />
                                    </div>
                                </a>
                            ))}
                        </div>
                     </div>
                </div>
             </div>
        </div>
    );
};

const BookCard = ({ book, isAdmin, onEdit }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  // Extract book data
  const { id, title, description, featured_image_url, pdf, chapters } = book;
  const pdfUrl = pdf?.url;
  const hasChapters = chapters && chapters.length > 0;
  
  // Logic: View Chapters (Modal) OR Download Direct
  const isMultiFile = hasChapters; 
  const canDownload = pdfUrl || hasChapters;

  // Adaptive colors based on mode (same pattern as CompactCourseCard)
  const cardColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    primary: getColor('primary', '#3b82f6'),
    accent: getColor('accent', '#f59e0b'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('background', '#ffffff'),
    borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonHoverBg: isDarkMode ? getColor('primary', '#3b82f6') : getColor('accent', '#f59e0b'),
    disabledBg: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    disabledText: isDarkMode ? 'rgba(255,255,255,0.3)' : '#9ca3af',
  };

  /**
   * Handle Main Action
   */
  const handleAction = async () => {
    if (!canDownload || isDownloading) return;
    
    if (isMultiFile) {
        setShowChapters(true);
        return;
    }

    // Default single file behavior
    setIsDownloading(true);
    try {
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('📚 Error downloading book:', error);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  return (
    <>
    <div 
      className="rounded-lg shadow-sm overflow-hidden flex flex-col w-full max-w-sm transition-all duration-300 hover:shadow-lg"
      style={{ 
        backgroundColor: cardColors.cardBg,
        border: `2px solid ${cardColors.borderColor}`
      }}
    >
      {/* Featured Image - 1:1 aspect ratio */}
      <div className="relative">
        {featured_image_url ? (
          <div 
            className="aspect-square bg-cover bg-center"
            style={{ backgroundImage: `url(${featured_image_url})` }}
          />
        ) : (
          <div 
            className="aspect-square flex items-center justify-center"
            style={{ backgroundColor: cardColors.primary }}
          >
            <Book className="w-20 h-20 text-white opacity-50" />
          </div>
        )}
        
        {/* Admin Edit Button */}
        {isAdmin && onEdit && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(book);
            }}
            className="absolute top-2 right-2 p-2 rounded-full shadow-lg transition-transform hover:scale-110 z-10"
            style={{ 
              backgroundColor: cardColors.accent,
              color: '#ffffff'
            }}
            title={t('common.edit')}
          >
            <Pencil size={16} />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 
          className="text-lg font-bold mb-4 line-clamp-2"
          style={{ color: cardColors.text }}
          dangerouslySetInnerHTML={{ __html: title }}
        />

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Action Button */}
        <button
          onClick={handleAction}
          disabled={!canDownload || isDownloading}
          className="w-full py-3 px-4 flex items-center justify-center gap-2 text-base font-semibold rounded-lg transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:hover:shadow-sm"
          style={{ 
            backgroundColor: canDownload ? cardColors.buttonBg : cardColors.disabledBg,
            color: canDownload ? cardColors.buttonText : cardColors.disabledText,
          }}
          onMouseEnter={(e) => {
            if (!canDownload || isDownloading) return;
            if (isDarkMode) {
              e.currentTarget.style.filter = 'brightness(1.15)';
            } else {
              e.currentTarget.style.backgroundColor = cardColors.buttonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
            if (canDownload) {
              e.currentTarget.style.backgroundColor = cardColors.buttonBg;
            }
          }}
        >
          {isDownloading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              {t('books.downloading')}
            </>
          ) : (
            isMultiFile ? (
                <>
                    <List className="w-5 h-5" />
                    {t('books.viewChapters', 'Ver Actualizaciones')}
                </>
            ) : (
                <>
                    <Download className="w-5 h-5" />
                    {pdfUrl ? t('books.download') : t('books.noDownload')}
                </>
            )
          )}
        </button>
      </div>
    </div>
    
    {showChapters && (
        <ChapterDetailsModal 
            book={book} 
            onClose={() => setShowChapters(false)} 
            colors={cardColors} 
        />
    )}
    </>
  );
};

export default BookCard;
