// admin/react-app/src/components/frontend/statistics/QuestionStatsChart.jsx

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { PieChart, CheckCircle, XCircle, HelpCircle, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';

const QuestionStatsChart = ({ 
  statsData, 
  compact = false,
  isDarkMode = false,
  pageColors = null 
}) => {
  const { getColor } = useTheme();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Use provided pageColors or generate defaults
  const colors = pageColors || {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

  const data = [
    { 
      label: 'Correctas', 
      value: statsData?.correct_answers || 0, 
      color: '#10b981',
      icon: CheckCircle,
      userPct: statsData?.user_correct_pct || 0,
      globalPct: statsData?.global_stats?.correct_pct || 0,
      diff: statsData?.comparison?.correct_diff || 0,
    },
    { 
      label: 'Incorrectas', 
      value: statsData?.incorrect_answers || 0, 
      color: '#ef4444',
      icon: XCircle,
      userPct: statsData?.user_incorrect_pct || 0,
      globalPct: statsData?.global_stats?.incorrect_pct || 0,
      diff: statsData?.comparison?.incorrect_diff || 0,
      invertDiff: true, // For incorrect, lower is better
    },
    { 
      label: 'Sin Contestar', 
      value: statsData?.unanswered || 0, 
      color: '#94a3b8',
      icon: HelpCircle,
      userPct: statsData?.user_unanswered_pct || 0,
      globalPct: statsData?.global_stats?.unanswered_pct || 0,
      diff: statsData?.comparison?.unanswered_diff || 0,
      invertDiff: true, // For unanswered, lower is better
    },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasGlobalStats = statsData?.global_stats?.total_users > 0;

  // Calculate angles for donut chart
  let currentAngle = -90;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const segment = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      index
    };
    currentAngle += angle;
    return segment;
  });

  const createArc = (startAngle, endAngle, innerRadius, outerRadius) => {
    const start = polarToCartesian(50, 50, outerRadius, endAngle);
    const end = polarToCartesian(50, 50, outerRadius, startAngle);
    const innerStart = polarToCartesian(50, 50, innerRadius, endAngle);
    const innerEnd = polarToCartesian(50, 50, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    return [
      `M ${start.x} ${start.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Helper to get diff icon and color
  const getDiffIndicator = (diff, invertDiff = false) => {
    const isPositive = invertDiff ? diff < 0 : diff > 0;
    const isNegative = invertDiff ? diff > 0 : diff < 0;
    
    if (Math.abs(diff) < 0.5) {
      return { Icon: Minus, color: colors.textMuted, label: 'igual' };
    }
    if (isPositive) {
      return { Icon: TrendingUp, color: '#10b981', label: 'mejor' };
    }
    return { Icon: TrendingDown, color: '#ef4444', label: 'peor' };
  };

  return (
    <div 
      className={`p-4 rounded-lg border flex flex-col ${compact ? '' : 'shadow-lg'}`}
      style={{ 
        backgroundColor: colors.background,
        borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4" style={{ color: colors.primary }} />
          <h2 className="text-sm font-semibold" style={{ color: colors.text }}>Distribución de Respuestas</h2>
        </div>
        {hasGlobalStats && (
          <div className="flex items-center gap-1 text-xs" style={{ color: colors.textMuted }}>
            <Users className="w-3 h-3" />
            <span>{statsData.global_stats.total_users} usuarios</span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-4 flex-1">
        {/* Donut Chart - Smaller */}
        <div className="relative flex-shrink-0 w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isDarkMode ? colors.primary + '20' : '#f3f4f6'}
              strokeWidth="16"
            />
            
            {/* Donut segments */}
            {segments.map((segment, index) => {
              const isHovered = hoveredSegment === index;
              const innerRadius = isHovered ? 28 : 30;
              const outerRadius = isHovered ? 44 : 42;
              
              return (
                <g key={index}>
                  <path
                    d={createArc(segment.startAngle, segment.endAngle, innerRadius, outerRadius)}
                    fill={segment.color}
                    className="transition-all duration-300 cursor-pointer"
                    style={{ 
                      filter: isHovered ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                      transformOrigin: '50% 50%'
                    }}
                    onMouseEnter={() => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-bold" style={{ color: colors.text }}>{total}</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>Total</p>
          </div>
        </div>

        {/* Legend with comparison */}
        <div className="flex-1 space-y-2">
          {data.map((item, index) => {
            const Icon = item.icon;
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            const isHovered = hoveredSegment === index;
            const diffIndicator = getDiffIndicator(item.diff, item.invertDiff);
            const DiffIcon = diffIndicator.Icon;
            
            return (
              <div 
                key={index}
                className="p-2 rounded transition-all cursor-pointer"
                style={{ 
                  backgroundColor: isHovered ? `${item.color}15` : 'transparent'
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {/* Main row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span className="text-xs font-medium" style={{ color: colors.text }}>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                    <span className="text-xs" style={{ color: colors.textMuted }}>({percentage}%)</span>
                  </div>
                </div>
                
                {/* Comparison row (only if global stats available) */}
                {hasGlobalStats && (
                  <div className="flex items-center justify-between mt-1 pl-5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        Media: {item.globalPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <DiffIcon className="w-3 h-3" style={{ color: diffIndicator.color }} />
                      <span className="text-xs font-medium" style={{ color: diffIndicator.color }}>
                        {item.diff > 0 ? '+' : ''}{item.diff}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk breakdown (if data available) */}
      {(statsData?.correct_with_risk !== undefined || statsData?.incorrect_with_risk !== undefined) && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? '#10b98115' : '#ecfdf5' }}>
              <div className="font-medium mb-1" style={{ color: '#10b981' }}>Correctas</div>
              <div className="flex justify-between" style={{ color: colors.text }}>
                <span>Con riesgo:</span>
                <span className="font-medium">{statsData?.correct_with_risk || 0}</span>
              </div>
              <div className="flex justify-between" style={{ color: colors.text }}>
                <span>Sin riesgo:</span>
                <span className="font-medium">{statsData?.correct_without_risk || 0}</span>
              </div>
            </div>
            <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? '#ef444415' : '#fef2f2' }}>
              <div className="font-medium mb-1" style={{ color: '#ef4444' }}>Incorrectas</div>
              <div className="flex justify-between" style={{ color: colors.text }}>
                <span>Con riesgo:</span>
                <span className="font-medium">{statsData?.incorrect_with_risk || 0}</span>
              </div>
              <div className="flex justify-between" style={{ color: colors.text }}>
                <span>Sin riesgo:</span>
                <span className="font-medium">{statsData?.incorrect_without_risk || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionStatsChart;
