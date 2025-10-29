import React from 'react';
import StatCard from './StatCard.jsx';

/**
 * Component that shows a responsive grid of statistical cards.
 *
 * @param {Object} props
 * @param {Array} props.stats - Array of configuration objects for each StatCard.
 * @param {string} [props.className] - Additional CSS classes for the grid container.
 * @returns {JSX.Element} The rendered grid of StatCard components
 */
const StatisticsBar = ({ stats = [], className = '' }) => {
  if (!stats || stats.length === 0) {
    return null;
  }

  // Define dynamically the number of columns to make it responsive
  const gridCols = `grid-cols-2 md:grid-cols-4 lg:grid-cols-${Math.min(stats.length, 6)}`;

  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          iconColor={stat.iconColor}
          bgColor={stat.bgColor}
        />
      ))}
    </div>
  );
};

export default StatisticsBar;