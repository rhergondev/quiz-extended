import React from 'react';
import {
  Edit, Trash2, Copy, BookOpen, Users, Calendar, DollarSign, ImageIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BaseCard from '../common/BaseCard';

/**
 * CourseCard Component - Displays course information in card format
 * Shows featured image, category, stats, and actions
 *
 * @param {object} props
 * @param {object} props.course - The course data object from the API
 * @param {string} props.viewMode - The current view mode ('cards' or 'list')
 * @param {Function} props.onEdit - Callback for the edit action
 * @param {Function} props.onDelete - Callback for the delete action
 * @param {Function} props.onDuplicate - Callback for the duplicate action
 * @param {Function} props.onClick - Callback for clicking the card
 */
const CourseCard = ({ course, viewMode, onEdit, onDelete, onDuplicate, onClick }) => {
  const { t } = useTranslation();

  // ============================================================
  // DATA EXTRACTION
  // ============================================================
  
  const {
    title = { rendered: t('courses.noCourses') },
    excerpt = { rendered: '' },
    meta = {},
    featured_media = 0,
    qe_category = [],
    _embedded = {}
  } = course;

  const {
    _price: price = 0,
    _start_date: startDate,
    _end_date: endDate,
  } = meta;

  // Extract lesson and student count from computed fields if available
  const lessonCount = course.lessons_count || 0;
  const studentCount = course.enrolled_users_count || 0;

  // ❇️ ADDED: Extract featured image from _embedded
  const featuredImage = _embedded?.['wp:featuredmedia']?.[0];
  const imageUrl = featuredImage?.source_url || featuredImage?.media_details?.sizes?.medium?.source_url || null;
  const imageAlt = featuredImage?.alt_text || title.rendered || title;

  // ❇️ ADDED: Extract category from _embedded
  const categoryData = _embedded?.['wp:term']?.[0]?.[0]; // First taxonomy array, first term
  const categoryName = categoryData?.name || null;
  const categorySlug = categoryData?.slug || null;

   const excerptText = excerpt?.rendered || excerpt || '';

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const getCategoryColor = (slug) => {
    const colors = {
      programming: 'bg-purple-100 text-purple-800',
      design: 'bg-pink-100 text-pink-800',
      business: 'bg-indigo-100 text-indigo-800',
      marketing: 'bg-yellow-100 text-yellow-800',
      photography: 'bg-cyan-100 text-cyan-800',
      development: 'bg-blue-100 text-blue-800',
      normal: 'bg-gray-100 text-gray-800'
    };
    return colors[slug] || 'bg-gray-100 text-gray-800';
  };
  
 const formatPrice = (priceValue) => {
    const numericPrice = Number(priceValue);
    if (isNaN(numericPrice) || numericPrice === 0) return t('courses.units.free');
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(numericPrice);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const cleanDescription = excerptText.replace(/<[^>]*>/g, '').trim();

  // ============================================================
  // ACTIONS CONFIGURATION
  // ============================================================

  const actions = [
    { label: t('common.edit'), icon: Edit, onClick: () => onEdit(course) },
    { label: t('common.duplicate'), icon: Copy, onClick: () => onDuplicate(course) },
    { label: t('common.delete'), icon: Trash2, onClick: () => onDelete(course), color: 'text-red-500' }
  ];

  // ============================================================
  // SLOT CONTENT DEFINITIONS
  // ============================================================

  /**
   * Header Slot - Featured image, title and category badge
   */
  const headerContent = (
    <>
      {/* ❇️ ADDED: Featured Image */}
      {imageUrl && (
        <div className="mb-4 -mx-6 -mt-6 overflow-hidden rounded-t-lg">
          <img 
            src={imageUrl} 
            alt={imageAlt}
            className="w-full h-48 object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-10 mb-3">
        {title.rendered || title}
      </h3>
      
      {/* ❇️ CHANGED: Category Badge - Now uses data from _embedded */}
      {categoryName && (
        <div className="flex flex-wrap gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(categorySlug)} capitalize`}>
            {categoryName}
          </span>
        </div>
      )}
    </>
  );

  /**
   * Main Content Slot - The description
   */
  const mainContent = (
    <p className="text-sm text-gray-600 line-clamp-2">
      {cleanDescription || t('courses.noDescription')}
    </p>
  );

const listContent = (
    <div className="flex items-center w-full gap-4">
      {/* Featured Image */}
      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
        {imageUrl ? ( // ❇️ FIX: Use imageUrl here
          <img 
            src={imageUrl} 
            alt={imageAlt} // ❇️ FIX: Use imageAlt here
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-gray-400" />
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate" title={title.rendered || title}>
          {title.rendered || title}
        </p>
        <p className="text-sm text-gray-500 truncate mt-1">
          {cleanDescription || 'No description.'}
        </p>
      </div>

      {/* Stats for List View */}
      <div className="hidden md:flex items-center gap-6 text-sm flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-600" title="Lessons">
          <BookOpen className="w-4 h-4" />
          <span>{lessonCount}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600" title="Students">
          <Users className="w-4 h-4" />
          <span>{studentCount}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600" title="End Date">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(endDate)}</span>
        </div>
        <div className="flex items-center gap-2 font-medium text-gray-800" title="Price">
          <DollarSign className="w-4 h-4" />
          <span>{formatPrice(price)}</span>
        </div>
      </div>
    </div>
  );

  /**
   * Stats Slot - Lessons, Students, Date, Price
   */
  const statsContent = (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <BookOpen className="w-4 h-4" />
        <span>{lessonCount} {lessonCount === 1 ? t('courses.units.lesson') : t('courses.units.lessons')}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600">
        <Users className="w-4 h-4" />
        <span>{studentCount} {studentCount === 1 ? t('courses.units.student') : t('courses.units.students')}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>{endDate ? formatDate(endDate) : t('courses.noEndDate')}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600">
        <DollarSign className="w-4 h-4" />
        <span className="font-medium">{formatPrice(price)}</span>
      </div>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <BaseCard
      viewMode={viewMode}
      actions={actions}
      onClick={() => onClick(course)}
      header={headerContent}
      stats={statsContent}
      listContent={listContent}
    >
      {mainContent}
    </BaseCard>
  );
};

CourseCard.defaultProps = {
  onEdit: () => {},
  onDelete: () => {},
  onDuplicate: () => {},
  onClick: () => {},
};

export default CourseCard;