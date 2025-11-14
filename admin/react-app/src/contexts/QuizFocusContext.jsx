import React, { createContext, useContext, useState, useMemo } from 'react';

const QuizFocusContext = createContext();

export const QuizFocusProvider = ({ children }) => {
  const [isQuizFocusMode, setIsQuizFocusMode] = useState(false);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ isQuizFocusMode, setIsQuizFocusMode }),
    [isQuizFocusMode]
  );

  return (
    <QuizFocusContext.Provider value={value}>
      {children}
    </QuizFocusContext.Provider>
  );
};

export const useQuizFocus = () => {
  const context = useContext(QuizFocusContext);
  if (!context) {
    throw new Error('useQuizFocus must be used within a QuizFocusProvider');
  }
  return context;
};
