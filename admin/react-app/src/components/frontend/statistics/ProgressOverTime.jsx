// admin/react-app/src/components/frontend/statistics/ProgressOverTime.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { LineChart, TrendingUp, Calendar } from 'lucide-react';

const ProgressOverTime = ({ selectedCourse, timeRange }) => {
  const { getColor } = useTheme();
  const [progressData, setProgressData] = useState([]);

  useEffect(() => {
    // Simulated progress data over time
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
        
        // Simulated accuracy that improves over time with some variance
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

  // Calculate SVG points for the line chart
  const width = 100;
  const height = 60;
  const points = progressData.map((d, i) => {
    const x = (i / (progressData.length - 1)) * width;
    const y = height - (((parseFloat(d.accuracy) - minAccuracy) / range) * height);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div 
      className="p-6 rounded-xl shadow-lg border-2 flex flex-col h-full"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      <div className="flex items-center justify-between mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <div className="flex items-center gap-3">
          <LineChart className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
          <h2 className="text-xl font-bold qe-text-primary">
            Evolución
          </h2>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs" 
             style={{ backgroundColor: getColor('primary', '#3b82f6') + '15' }}>
          <Calendar className="w-3 h-3" style={{ color: getColor('primary', '#3b82f6') }} />
          <span className="font-medium" style={{ color: getColor('primary', '#3b82f6') }}>
            {timeRange === 'week' ? '7 días' : 
             timeRange === 'month' ? '30 días' : 
             timeRange === 'year' ? '12 meses' : 
             'Todo'}
          </span>
        </div>
      </div>

      {/* SVG Line Chart - Más grande y limpio */}
      <div className="flex-1 mb-4">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines - Menos líneas */}
          {[0, 50, 100].map(percent => {
            const y = height - ((percent / 100) * height);
            return (
              <g key={percent}>
                <line 
                  x1="0" 
                  y1={y} 
                  x2={width} 
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
                <text
                  x="-2"
                  y={y}
                  textAnchor="end"
                  fontSize="3"
                  fill="#9ca3af"
                  dominantBaseline="middle"
                >
                  {percent}%
                </text>
              </g>
            );
          })}
          
          {/* Area under the line */}
          <polygon 
            points={areaPoints}
            fill="url(#gradient)"
            opacity="0.2"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={getColor('primary', '#3b82f6')}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points - Solo el primero y el último */}
          {progressData.map((d, i) => {
            if (i !== 0 && i !== progressData.length - 1) return null;
            const x = (i / (progressData.length - 1)) * width;
            const y = height - (((parseFloat(d.accuracy) - minAccuracy) / range) * height);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.2"
                fill={getColor('primary', '#3b82f6')}
                stroke="#ffffff"
                strokeWidth="0.4"
              />
            );
          })}
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getColor('primary', '#3b82f6')} stopOpacity="0.4" />
              <stop offset="100%" stopColor={getColor('primary', '#3b82f6')} stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Stats compactos */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t-2" style={{ borderColor: getColor('primary', '#3b82f6') + '20' }}>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: getColor('primary', '#3b82f6') + '10' }}>
          <p className="text-xs qe-text-secondary mb-0.5">Promedio</p>
          <p className="text-xl font-bold" style={{ color: getColor('primary', '#3b82f6') }}>
            {((progressData.reduce((sum, d) => sum + parseFloat(d.accuracy), 0) / progressData.length) || 0).toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#10b98115' }}>
          <p className="text-xs qe-text-secondary mb-0.5">Mejora</p>
          <p className="text-xl font-bold" style={{ color: '#10b981' }}>
            +{((maxAccuracy - minAccuracy)).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressOverTime;
