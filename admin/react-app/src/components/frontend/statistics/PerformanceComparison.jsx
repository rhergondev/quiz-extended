// admin/react-app/src/components/frontend/statistics/PerformanceComparison.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Users, TrendingUp, Trophy, Award } from 'lucide-react';

const PerformanceComparison = ({ 
  userAccuracy, 
  selectedCourse,
  compact = false,
  isDarkMode = false,
  pageColors = null 
}) => {
  const { getColor } = useTheme();
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use provided pageColors or generate defaults
  const colors = pageColors || {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    primary: getColor('primary', '#3b82f6'),
    accent: getColor('accent', '#f59e0b'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

  useEffect(() => {
    const fetchComparisonData = async () => {
      setLoading(true);
      
      setTimeout(() => {
        const averageAccuracy = 68.5;
        const topPerformers = 85.0;
        const totalStudents = 156;
        
        setComparisonData({
          average: averageAccuracy,
          topPerformers,
          totalStudents,
          userRank: Math.floor(Math.random() * totalStudents) + 1,
          percentile: userAccuracy > averageAccuracy ? 
            Math.min(95, 50 + ((userAccuracy - averageAccuracy) / (100 - averageAccuracy)) * 50) : 
            Math.max(5, (userAccuracy / averageAccuracy) * 50)
        });
        setLoading(false);
      }, 500);
    };

    fetchComparisonData();
  }, [userAccuracy, selectedCourse]);

  if (loading || !comparisonData) {
    return (
      <div 
        className="p-4 rounded-lg border flex items-center justify-center"
        style={{ 
          backgroundColor: colors.background,
          borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb',
          minHeight: '120px'
        }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: colors.primary }}></div>
      </div>
    );
  }

  const comparisons = [
    {
      label: 'Tú',
      value: userAccuracy,
      color: colors.primary,
      icon: Trophy,
    },
    {
      label: 'Promedio',
      value: comparisonData.average,
      color: '#94a3b8',
      icon: Users,
    },
    {
      label: 'Top 10%',
      value: comparisonData.topPerformers,
      color: colors.accent,
      icon: Award,
    }
  ];

  const maxValue = Math.max(...comparisons.map(c => c.value));
  const difference = userAccuracy - comparisonData.average;
  const isAboveAverage = difference > 0;

  return (
    <div 
      className={`p-4 rounded-lg border ${compact ? '' : 'shadow-lg'}`}
      style={{ 
        backgroundColor: colors.background,
        borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
        <Users className="w-4 h-4" style={{ color: colors.primary }} />
        <h2 className="text-sm font-semibold" style={{ color: colors.text }}>Comparación</h2>
      </div>

      {/* Compact comparison bars */}
      <div className="space-y-2.5 mb-3">
        {comparisons.map((item, index) => {
          const Icon = item.icon;
          const percentage = (item.value / maxValue) * 100;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  <span className="text-xs font-medium" style={{ color: colors.text }}>{item.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: item.color }}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
              
              <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? colors.primary + '20' : '#e5e7eb' }}>
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight - Compact */}
      <div 
        className="p-2 rounded border-l-2"
        style={{ 
          backgroundColor: isAboveAverage ? '#10b98110' : colors.accent + '10',
          borderColor: isAboveAverage ? '#10b981' : colors.accent
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp 
            className={`w-4 h-4 ${isAboveAverage ? '' : 'rotate-180'}`}
            style={{ color: isAboveAverage ? '#10b981' : colors.accent }}
          />
          <p className="text-xs" style={{ color: colors.text }}>
            {isAboveAverage ? (
              <><strong style={{ color: '#10b981' }}>+{Math.abs(difference).toFixed(1)}%</strong> sobre el promedio</>
            ) : (
              <><strong style={{ color: colors.accent }}>{Math.abs(difference).toFixed(1)}%</strong> para alcanzar promedio</>
            )}
          </p>
        </div>
      </div>

      {/* Rank info - Compact */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="p-2 rounded text-center" style={{ backgroundColor: isDarkMode ? colors.primary + '15' : '#f3f4f6' }}>
          <p className="text-xs" style={{ color: colors.textMuted }}>Posición</p>
          <p className="text-lg font-bold" style={{ color: colors.primary }}>
            #{comparisonData.userRank}
          </p>
        </div>
        
        <div className="p-2 rounded text-center" style={{ backgroundColor: isDarkMode ? '#8b5cf615' : '#f5f3ff' }}>
          <p className="text-xs" style={{ color: colors.textMuted }}>Percentil</p>
          <p className="text-lg font-bold" style={{ color: '#8b5cf6' }}>
            {comparisonData.percentile.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceComparison;
