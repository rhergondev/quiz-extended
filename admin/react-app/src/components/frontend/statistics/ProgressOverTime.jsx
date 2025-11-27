// admin/react-app/src/components/frontend/statistics/ProgressOverTime.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { LineChart, TrendingUp, Calendar } from 'lucide-react';

const ProgressOverTime = ({ 
  selectedCourse, 
  timeRange,
  compact = false,
  isDarkMode = false,
  pageColors = null 
}) => {
  const { getColor } = useTheme();
  const [progressData, setProgressData] = useState([]);

  // Use provided pageColors or generate defaults
  const colors = pageColors || {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

  useEffect(() => {
    const generateProgressData = () => {
      const data = [];
      const today = new Date();
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'year' ? 12 : 30;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        if (timeRange === 'year') {
          date.setMonth(date.getMonth() - i);
        } else {
          date.setDate(date.getDate() - i);
        }
        
        const baseAccuracy = 50 + (((days - i) / days) * 30);
        const accuracy = Math.min(100, Math.max(0, baseAccuracy + (Math.random() * 20 - 10)));
        
        data.push({
          date: date.toLocaleDateString('es-ES', { 
            month: 'short', 
            day: timeRange === 'year' ? undefined : 'numeric' 
          }),
          accuracy: accuracy.toFixed(1),
          questions: Math.floor(Math.random() * 20) + 5
        });
      }
      
      setProgressData(data);
    };

    generateProgressData();
  }, [timeRange, selectedCourse]);

  if (progressData.length === 0) return null;

  const maxAccuracy = Math.max(...progressData.map(d => parseFloat(d.accuracy)));
  const minAccuracy = Math.min(...progressData.map(d => parseFloat(d.accuracy)));
  const range = maxAccuracy - minAccuracy || 1;
  const avgAccuracy = (progressData.reduce((sum, d) => sum + parseFloat(d.accuracy), 0) / progressData.length) || 0;

  const width = 100;
  const height = 50;
  const points = progressData.map((d, i) => {
    const x = (i / (progressData.length - 1)) * width;
    const y = height - (((parseFloat(d.accuracy) - minAccuracy) / range) * height);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div 
      className={`p-4 rounded-lg border flex flex-col ${compact ? '' : 'shadow-lg'}`}
      style={{ 
        backgroundColor: colors.background,
        borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4" style={{ color: colors.primary }} />
          <h2 className="text-sm font-semibold" style={{ color: colors.text }}>Evolución</h2>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" 
             style={{ backgroundColor: isDarkMode ? colors.primary + '20' : '#f3f4f6' }}>
          <Calendar className="w-3 h-3" style={{ color: colors.primary }} />
          <span className="font-medium" style={{ color: colors.primary }}>
            {timeRange === 'week' ? '7d' : timeRange === 'month' ? '30d' : timeRange === 'year' ? '1a' : 'Todo'}
          </span>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="flex-1 mb-3" style={{ minHeight: '80px' }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 50, 100].map(percent => {
            const y = height - ((percent / 100) * height);
            return (
              <g key={percent}>
                <line 
                  x1="0" 
                  y1={y} 
                  x2={width} 
                  y2={y}
                  stroke={isDarkMode ? colors.primary + '20' : '#e5e7eb'}
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
              </g>
            );
          })}
          
          {/* Area under the line */}
          <polygon 
            points={areaPoints}
            fill={`url(#gradient-${isDarkMode ? 'dark' : 'light'})`}
            opacity="0.3"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={colors.primary}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Start and end points */}
          {progressData.map((d, i) => {
            if (i !== 0 && i !== progressData.length - 1) return null;
            const x = (i / (progressData.length - 1)) * width;
            const y = height - (((parseFloat(d.accuracy) - minAccuracy) / range) * height);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill={colors.primary}
                stroke={colors.background}
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${isDarkMode ? 'dark' : 'light'}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: isDarkMode ? colors.primary + '20' : '#e5e7eb' }}>
        <div className="text-center p-1.5 rounded" style={{ backgroundColor: isDarkMode ? colors.primary + '15' : '#f3f4f6' }}>
          <p className="text-xs" style={{ color: colors.textMuted }}>Promedio</p>
          <p className="text-base font-bold" style={{ color: colors.primary }}>
            {avgAccuracy.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-1.5 rounded" style={{ backgroundColor: isDarkMode ? '#10b98115' : '#f0fdf4' }}>
          <p className="text-xs" style={{ color: colors.textMuted }}>Mejora</p>
          <p className="text-base font-bold" style={{ color: '#10b981' }}>
            +{(maxAccuracy - minAccuracy).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressOverTime;
