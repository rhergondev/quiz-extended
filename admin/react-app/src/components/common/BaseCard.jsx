// src/components/common/BaseCard.jsx

import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * A generic base card component that provides a consistent shell,
 * view mode handling (card vs list), and a dropdown actions menu.
 * It uses a slot-based approach for content via props.
 *
 * @param {object} props
 * @param {string} [props.viewMode='cards'] - The display mode ('cards' or 'list').
 * @param {Array} [props.actions=[]] - Array of action objects for the dropdown menu.
 * @param {Function} [props.onClick] - Click handler for the entire card.
 * @param {React.ReactNode} [props.header] - Content for the header slot.
 * @param {React.ReactNode} [props.stats] - Content for the stats/middle slot.
 * @param {React.ReactNode} [props.children] - Main content for the body.
 * @param {React.ReactNode} [props.footer] - Content for the footer slot.
 * @param {string} [props.className] - Additional CSS classes.
 */
const BaseCard = ({
  viewMode = 'cards',
  actions = [],
  onClick,
  header,
  stats,
  children,
  footer,
  className = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleActionClick = (e, actionCallback) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    setIsDropdownOpen(false);
    if (actionCallback) {
      actionCallback();
    }
  };

  const baseClasses = `bg-white border border-gray-200 transition-shadow relative ${
    onClick ? 'cursor-pointer hover:shadow-lg' : 'shadow-sm'
  } ${className}`;

  if (viewMode === 'list') {
    return (
      <div onClick={onClick} className={`${baseClasses} rounded-lg p-4 flex items-center gap-4`}>
        {/* In list view, children is prioritized */}
        <div className="flex-1 min-w-0">{children}</div>
        
        {/* Actions Menu */}
        {actions.length > 0 && (
          <div className="relative flex-shrink-0">
            {/* ... (Dropdown JSX, same as below) ... */}
          </div>
        )}
      </div>
    );
  }

  // Default is 'cards' view
  return (
    <div onClick={onClick} className={`${baseClasses} rounded-lg flex flex-col`}>
      {/* Actions Menu */}
      {actions.length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(prev => !prev);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); }}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={(e) => handleActionClick(e, action.onClick)}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 text-gray-700 hover:bg-gray-50"
                    >
                      {action.icon && <action.icon className={`h-4 w-4 ${action.color || ''}`} />}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Header Slot */}
      {header && <div className="p-6 border-b border-gray-100">{header}</div>}

      {/* Main Content (Children) */}
      <div className="p-6 flex-1">
        {children}
      </div>

      {/* Stats Slot */}
      {stats && <div className="p-6 bg-gray-50/75 border-t border-gray-100">{stats}</div>}
      
      {/* Footer Slot */}
      {footer && <div className="p-4 border-t border-gray-100">{footer}</div>}
    </div>
  );
};

export default BaseCard;