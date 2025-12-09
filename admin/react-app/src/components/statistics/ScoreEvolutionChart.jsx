import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getScoreEvolution } from '../../api/services/userStatsService';

const ScoreEvolutionChart = ({ courseId, lessonId = null, compact = false, isDarkMode: propIsDarkMode, pageColors: propPageColors }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode: contextIsDarkMode } = useTheme();
  const { formatScore, isPercentage } = useScoreFormat();
  
  const isDarkMode = propIsDarkMode ?? contextIsDarkMode;
  const pageColors = propPageColors || {
    text: isDarkMode ? '#f9fafb' : '#1a202c',
    textMuted: isDarkMode ? '#9ca3af' : '#6b7280',
    background: isDarkMode ? '#1f2937' : '#ffffff',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1f2937' : '#ffffff',
  };
  
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log(`📈 Fetching evolution for course ${courseId}, lesson ${lessonId}, period: ${period}`);
        const response = await getScoreEvolution(courseId, period, lessonId);
        console.log('📈 Evolution API Response:', response);
        
        const evolutionData = response.data || [];
        
        // Transform data for chart
        // Backend already returns scores in base10 (0-10)
        const chartData = evolutionData.map(item => ({
          date: new Date(item.date).toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
          fullDate: item.date,
          score: item.score, // Already in base10 (0-10)
          attempts: item.attempts
        }));
        
        setData(chartData);
      } catch (err) {
        console.error('Error fetching score evolution:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, period, lessonId]);

  // Calculate trend
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    
    const firstScore = data[0].score;
    const lastScore = data[data.length - 1].score;
    const diff = lastScore - firstScore;
    
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }, [data]);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={18} className="text-green-500" />;
      case 'down':
        return <TrendingDown size={18} className="text-red-500" />;
      case 'stable':
        return <Minus size={18} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTrendText = () => {
    if (!trend || data.length < 2) return '';
    
    const firstScore = data[0].score;
    const lastScore = data[data.length - 1].score;
    const diff = Math.abs(lastScore - firstScore);
    
    switch (trend) {
      case 'up':
        return t('statistics.chart.trendUp', { diff: formatScore(diff) });
      case 'down':
        return t('statistics.chart.trendDown', { diff: formatScore(diff) });
      case 'stable':
        return t('statistics.chart.trendStable');
      default:
        return '';
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="rounded-lg shadow-lg p-3 border"
          style={{ 
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('primary', '#3b82f6')
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: getColor('primary', '#1a202c') }}>
            {data.fullDate}
          </p>
          <p className="text-lg font-bold" style={{ color: getColor('primary', '#3b82f6') }}>
            {t('statistics.score')}: {formatScore(data.score)}
          </p>
          <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
            {data.attempts} {data.attempts === 1 ? t('statistics.attempt') : t('statistics.attempts')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div 
        className={`rounded-lg border ${compact ? 'p-3' : 'shadow-sm p-6'}`}
        style={{ backgroundColor: pageColors.cardBg, borderColor: pageColors.border }}
      >
        <div className={`flex items-center justify-center ${compact ? 'h-48' : 'h-64'}`}>
          <div 
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: getColor('primary', '#3b82f6') }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`rounded-lg border ${compact ? 'p-3' : 'shadow-sm p-6'}`}
        style={{ backgroundColor: pageColors.cardBg, borderColor: pageColors.border }}
      >
        <p className="text-red-500 text-center text-xs">{t('statistics.chart.error')}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div 
        className={`rounded-lg border ${compact ? 'p-3' : 'shadow-sm p-6'}`}
        style={{ backgroundColor: pageColors.cardBg, borderColor: pageColors.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={compact ? 16 : 24} style={{ color: pageColors.text }} />
          <h3 className={`font-bold ${compact ? 'text-sm' : 'text-xl'}`} style={{ color: pageColors.text }}>
            {t('statistics.chart.title')}
          </h3>
        </div>
        <p className={`text-center ${compact ? 'py-4 text-xs' : 'py-8'}`} style={{ color: pageColors.textMuted }}>
          {t('statistics.chart.noData')}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-lg border ${compact ? 'p-3' : 'shadow-sm p-4 sm:p-6'}`}
      style={{ backgroundColor: pageColors.cardBg, borderColor: pageColors.border }}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${compact ? 'gap-2 mb-3' : 'gap-4 mb-6'}`}>
        <div className="flex items-center gap-2">
          <Calendar size={compact ? 14 : 24} style={{ color: pageColors.text }} />
          <div>
            <h3 className={`font-bold ${compact ? 'text-xs' : 'text-lg sm:text-xl'}`} style={{ color: pageColors.text }}>
              {t('statistics.chart.title')}
            </h3>
            {trend && !compact && (
              <div className="flex items-center gap-2 mt-1">
                {getTrendIcon()}
                <span className="text-xs sm:text-sm" style={{ color: pageColors.textMuted }}>
                  {getTrendText()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Period Filter */}
        <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
          {['week', 'month', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-lg font-medium transition-all ${
                period === p ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: period === p ? getColor('primary', '#3b82f6') : 'transparent',
                color: period === p ? '#ffffff' : pageColors.text,
                border: period === p ? 'none' : `1px solid ${pageColors.border}`
              }}
            >
              {t(`statistics.chart.period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={compact ? 180 : 300}>
        <LineChart data={data} margin={{ top: 5, right: compact ? 10 : 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={pageColors.border} />
          <XAxis 
            dataKey="date" 
            stroke={pageColors.textMuted}
            style={{ fontSize: compact ? '10px' : '12px' }}
            tick={{ fill: pageColors.textMuted }}
          />
          <YAxis 
            stroke={pageColors.textMuted}
            style={{ fontSize: compact ? '10px' : '12px' }}
            domain={[0, isPercentage ? 100 : 10]}
            tickFormatter={(value) => formatScore(value)}
            tick={{ fill: pageColors.textMuted }}
            width={compact ? 30 : 40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke={isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6')}
            strokeWidth={compact ? 2 : 3}
            dot={{ fill: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'), r: compact ? 3 : 4 }}
            activeDot={{ r: compact ? 4 : 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreEvolutionChart;
