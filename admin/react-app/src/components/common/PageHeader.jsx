// src/components/common/PageHeader.jsx

import React from 'react';
import StatisticsBar from './StatisticsBar';
import Button from './Button';
import { Loader2 } from 'lucide-react';

/**
 * A reusable header component for manager pages.
 * It includes a title, description, action buttons, a loading indicator,
 * and a statistics bar.
 *
 * @param {object} props
 * @param {string} props.title - The main title of the page.
 * @param {string} props.description - A short description appearing under the title.
 * @param {Array} props.stats - An array of stat objects for the StatisticsBar.
 * @param {object} props.primaryAction - Configuration for the main action button.
 * @param {string} props.primaryAction.text - The text for the button.
 * @param {Function} props.primaryAction.onClick - The click handler.
 * @param {boolean} [props.primaryAction.isLoading=false] - Loading state for the button.
 * @param {React.Component} [props.primaryAction.icon] - Icon for the button.
 * @param {object} [props.secondaryAction] - Configuration for a secondary action button.
 * @param {boolean} [props.isLoading=false] - A general loading state for the header (e.g., filtering).
 * @param {string} [props.className] - Additional CSS classes.
 */
const PageHeader = ({
  title,
  description,
  stats = [],
  primaryAction,
  secondaryAction,
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Top section: Title and Action Buttons */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* General loading indicator */}
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              <span>Updating...</span>
            </div>
          )}

          {/* Secondary Action Button */}
          {secondaryAction && (
            <Button
              variant="secondary"
              size="md"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.isLoading || isLoading}
              iconLeft={secondaryAction.icon}
            >
              {secondaryAction.text}
            </Button>
          )}

          {/* Primary Action Button */}
          {primaryAction && (
            <Button
              variant="primary"
              size="md"
              onClick={primaryAction.onClick}
              isLoading={primaryAction.isLoading}
              iconLeft={primaryAction.icon}
            >
              {primaryAction.text}
            </Button>
          )}
        </div>
      </div>

      {/* Bottom section: Statistics Bar */}
      {stats.length > 0 && <StatisticsBar stats={stats} />}
    </div>
  );
};

export default PageHeader;