/**
 * AdminLayout Component
 * 
 * Main layout wrapper for admin pages.
 * Includes AdminTopbar and content area.
 * 
 * @package QuizExtended
 * @subpackage Components/Layout
 * @version 1.0.0
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminTopbar from './AdminTopbar';
import { useTheme } from '../../contexts/ThemeContext';

const AdminLayout = () => {
  const { getColor, isDarkMode } = useTheme();

  // Page colors following TestsPage pattern
  const pageColors = {
    bg: isDarkMode ? getColor('background', '#111827') : getColor('background', '#f3f4f6'),
  };

  return (
    <div 
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: pageColors.bg }}
    >
      <AdminTopbar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
