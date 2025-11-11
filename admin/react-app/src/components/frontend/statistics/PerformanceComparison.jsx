// admin/react-app/src/components/frontend/statistics/PerformanceComparison.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Users, TrendingUp, Trophy, Award } from 'lucide-react';

const PerformanceComparison = ({ userAccuracy, selectedCourse }) => {
  const { getColor } = useTheme();
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data - En producción, esto vendría de una API
    // que calcule promedios de todos los estudiantes
    const fetchComparisonData = async () => {
      setLoading(true);
      
      // Simulación de datos del servidor
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
        className="p-6 rounded-xl shadow-lg flex items-center justify-center"
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
             style={{ borderColor: getColor('primary', '#3b82f6') }}></div>
      </div>
    );
  }

  const comparisons = [
    {
      label: 'Tu Precisión',
      value: userAccuracy,
      color: getColor('primary', '#3b82f6'),
      icon: Trophy,
      description: 'Tu rendimiento actual'
    },
    {
      label: 'Promedio General',
      value: comparisonData.average,
      color: getColor('secondary', '#94a3b8'),
      icon: Users,
      description: `Entre ${comparisonData.totalStudents} estudiantes`
    },
    {
      label: 'Top Performers',
      value: comparisonData.topPerformers,
      color: getColor('accent', '#f59e0b'),
      icon: Award,
      description: '10% mejores estudiantes'
    }
  ];

  const maxValue = Math.max(...comparisons.map(c => c.value));
  const difference = userAccuracy - comparisonData.average;
  const isAboveAverage = difference > 0;

  return (
    <div 
      className="p-6 rounded-xl shadow-lg border-2"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <Users className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
        <h2 className="text-xl font-bold qe-text-primary">Comparación de Rendimiento</h2>
      </div>

      {/* Performance comparison bars */}
      <div className="space-y-6 mb-8">
        {comparisons.map((item, index) => {
          const Icon = item.icon;
          const percentage = (item.value / maxValue) * 100;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                  <span className="font-semibold qe-text-primary">{item.label}</span>
                </div>
                <span className="text-xl font-bold" style={{ color: item.color }}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
              
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 flex items-center justify-end px-3"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color
                  }}
                >
                  {percentage > 20 && (
                    <span className="text-xs font-bold text-white">
                      {item.value.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-sm qe-text-secondary ml-7">{item.description}</p>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div 
        className="p-4 rounded-lg border-l-4"
        style={{ 
          backgroundColor: isAboveAverage ? '#10b98110' : getColor('accent', '#f59e0b') + '10',
          borderColor: isAboveAverage ? '#10b981' : getColor('accent', '#f59e0b')
        }}
      >
        <div className="flex items-start gap-3">
          <TrendingUp 
            className={`w-6 h-6 mt-1 ${isAboveAverage ? '' : 'rotate-180'}`}
            style={{ color: isAboveAverage ? '#10b981' : getColor('accent', '#f59e0b') }}
          />
          <div>
            <p className="font-bold qe-text-primary mb-1">
              {isAboveAverage ? '¡Excelente trabajo!' : 'Sigue mejorando'}
            </p>
            <p className="qe-text-secondary text-sm">
              {isAboveAverage ? (
                <>
                  Estás <strong style={{ color: '#10b981' }}>{Math.abs(difference).toFixed(1)}%</strong> por encima del promedio.
                  Te encuentras en el <strong>percentil {comparisonData.percentile.toFixed(0)}</strong>, 
                  superando a la mayoría de estudiantes.
                </>
              ) : (
                <>
                  Estás <strong style={{ color: getColor('accent', '#f59e0b') }}>{Math.abs(difference).toFixed(1)}%</strong> por debajo del promedio.
                  Con un poco más de práctica, puedes alcanzar el nivel promedio y superarlo.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Rankings info */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-4 rounded-lg text-center" style={{ 
          backgroundColor: getColor('primary', '#3b82f6') + '15'
        }}>
          <p className="text-sm font-medium text-gray-600">Tu Posición</p>
          <p className="text-3xl font-bold mt-1" style={{ color: getColor('primary', '#3b82f6') }}>
            #{comparisonData.userRank}
          </p>
          <p className="text-xs text-gray-500 mt-1">de {comparisonData.totalStudents}</p>
        </div>
        
        <div className="p-4 rounded-lg text-center" style={{ 
          backgroundColor: getColor('secondary', '#8b5cf6') + '15'
        }}>
          <p className="text-sm font-medium text-gray-600">Percentil</p>
          <p className="text-3xl font-bold mt-1" style={{ color: getColor('secondary', '#8b5cf6') }}>
            {comparisonData.percentile.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">mejor que otros</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceComparison;
