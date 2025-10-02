import React from 'react';

/**
 * Component to show a single card with an icon, label, and value.
 * 
 * @param {object} props
 * @param {string} props.label - The stat label.
 * @param {string|number} props.value - The value to display.
 * @param {React.Component} props.icon - The icon component (from lucide-react).
 * @param {string} [props.iconColor='text-gray-500'] - Class for the icon color.
 * @param {string} [props.bgColor='bg-gray-50'] - Class for the background color.
 * @returns {JSX.Element} The rendered card component.
 * 
 * @package QuizExtended
 * @subpackage Admin/ReactApp/Components/Common
 * @version 1.0.0
 */
const StatCard = ({ label, value, icon: Icon, iconColor = 'text-gray-500', bgColor = 'bg-gray-50' }) => {
  return (
    <div className={`${bgColor} rounded-lg p-4 shadow-sm border border-gray-100`}>
      <div className="flex items-center">
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        )}
        <div className="ml-4 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{label}</p>
          <p className="text-xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;