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

const ScoreEvolutionChart = ({ courseId }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const { formatScore, isPercentage } = useScoreFormat();
  
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
        console.log(`📈 Fetching evolution for course ${courseId}, period: ${period}`);
        const response = await getScoreEvolution(courseId, period);
        console.log('📈 Evolution API Response:', response);
        
        const evolutionData = response.data || [];
        console.log('📈 Evolution Data Array:', evolutionData);
        
        // Transform data for chart
        const chartData = evolutionData.map(item => ({
          date: new Date(item.date).toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
          fullDate: item.date,
          score: item.score / 10, // Convert from 0-100 to 0-10
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
  }, [courseId, period]);

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
        className="rounded-lg shadow-sm p-6"
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        <div className="flex items-center justify-center h-64">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: getColor('primary', '#3b82f6') }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="rounded-lg shadow-sm p-6"
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        <p className="text-red-500 text-center">{t('statistics.chart.error')}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div 
        className="rounded-lg shadow-sm p-6"
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Calendar size={24} style={{ color: getColor('primary', '#1a202c') }} />
          <h3 className="text-xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
            {t('statistics.chart.title')}
          </h3>
        </div>
        <p className="text-center py-8" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
          {t('statistics.chart.noData')}
        </p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg shadow-sm p-4 sm:p-6"
      style={{ backgroundColor: getColor('background', '#ffffff') }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} style={{ color: getColor('primary', '#1a202c') }} />
          <div>
            <h3 className="text-lg sm:text-xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
              {t('statistics.chart.title')}
            </h3>
            {trend && (
              <div className="flex items-center gap-2 mt-1">
                {getTrendIcon()}
                <span className="text-xs sm:text-sm" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                  {getTrendText()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2">
          {['week', 'month', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p ? 'shadow-md' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: period === p ? getColor('primary', '#3b82f6') : 'transparent',
                color: period === p ? '#ffffff' : getColor('primary', '#1a202c'),
                border: period === p ? 'none' : `1px solid ${getColor('primary', '#d1d5db')}`
              }}
            >
              {t(`statistics.chart.period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${getColor('primary', '#d1d5db')}40`} />
          <XAxis 
            dataKey="date" 
            stroke={getColor('primary', '#9ca3af')}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke={getColor('primary', '#9ca3af')}
            style={{ fontSize: '12px' }}
            domain={[0, isPercentage ? 100 : 10]}
            tickFormatter={(value) => formatScore(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke={getColor('primary', '#3b82f6')}
            strokeWidth={3}
            dot={{ fill: getColor('primary', '#3b82f6'), r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreEvolutionChart;
