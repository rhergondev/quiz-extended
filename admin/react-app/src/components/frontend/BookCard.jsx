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
import { Book, Download, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const BookCard = ({ book }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  // Extract book data
  const { id, title, description, featured_image_url, pdf } = book;
  const pdfUrl = pdf?.url;
  const pdfFilename = pdf?.filename || `${title}.pdf`;

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
   * Handle PDF download
   */
  const handleDownload = async () => {
    if (!pdfUrl || isDownloading) return;

    setIsDownloading(true);

    try {
      // Open PDF in new tab - browser will handle download or viewing
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('📚 Error downloading book:', error);
    } finally {
      // Reset after short delay
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  return (
    <div 
      className="rounded-lg shadow-sm overflow-hidden flex flex-col w-full max-w-sm transition-all duration-300 hover:shadow-lg"
      style={{ 
        backgroundColor: cardColors.cardBg,
        border: `2px solid ${cardColors.borderColor}`
      }}
    >
      {/* Featured Image - 1:1 aspect ratio */}
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

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={!pdfUrl || isDownloading}
          className="w-full py-3 px-4 flex items-center justify-center gap-2 text-base font-semibold rounded-lg transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:hover:shadow-sm"
          style={{ 
            backgroundColor: pdfUrl ? cardColors.buttonBg : cardColors.disabledBg,
            color: pdfUrl ? cardColors.buttonText : cardColors.disabledText,
          }}
          onMouseEnter={(e) => {
            if (!pdfUrl || isDownloading) return;
            if (isDarkMode) {
              e.currentTarget.style.filter = 'brightness(1.15)';
            } else {
              e.currentTarget.style.backgroundColor = cardColors.buttonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
            if (pdfUrl) {
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
            <>
              <Download className="w-5 h-5" />
              {pdfUrl ? t('books.download') : t('books.noDownload')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BookCard;
