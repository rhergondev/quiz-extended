/**
 * Calendar Notes Service
 * 
 * Handles API operations for calendar notes (admin-created custom events)
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { getApiConfig } from '../config/apiConfig.js';

/**
 * Get WordPress configuration
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found.');
  }
  
  return config;
};

/**
 * Make API request
 */
const makeApiRequest = async (url, options = {}) => {
  const config = getWpConfig();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': config.nonce,
    },
    credentials: 'same-origin',
    ...options
  };

  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }
  
  return response.json();
};

/**
 * Get calendar notes for a course
 * @param {number} courseId - Course ID
 * @returns {Promise<Array>} List of calendar notes
 */
export const getCalendarNotes = async (courseId) => {
  const apiConfig = getApiConfig();
  const url = `${apiConfig.apiUrl}/quiz-extended/v1/courses/${courseId}/calendar-notes`;
  
  const response = await makeApiRequest(url, { method: 'GET' });
  return response.data || [];
};

/**
 * Create a new calendar note
 * @param {number} courseId - Course ID
 * @param {Object} noteData - Note data
 * @param {string} noteData.title - Note title
 * @param {string} [noteData.description] - Note description
 * @param {string} noteData.note_date - Date in YYYY-MM-DD format
 * @param {string} [noteData.color] - Hex color (default: #8B5CF6)
 * @param {string} [noteData.type] - Type: 'note' or 'live_class' (default: 'note')
 * @param {string} [noteData.link] - Meeting link (for live_class type)
 * @param {string} [noteData.time] - Time in HH:MM format (for live_class type)
 * @returns {Promise<Object>} Created note
 */
export const createCalendarNote = async (courseId, noteData) => {
  const apiConfig = getApiConfig();
  const url = `${apiConfig.apiUrl}/quiz-extended/v1/courses/${courseId}/calendar-notes`;
  
  const response = await makeApiRequest(url, {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
  
  return response.data;
};

/**
 * Update an existing calendar note
 * @param {number} courseId - Course ID
 * @param {number} noteId - Note ID
 * @param {Object} noteData - Note data to update
 * @returns {Promise<Object>} Updated note
 */
export const updateCalendarNote = async (courseId, noteId, noteData) => {
  const apiConfig = getApiConfig();
  const url = `${apiConfig.apiUrl}/quiz-extended/v1/courses/${courseId}/calendar-notes/${noteId}`;
  
  const response = await makeApiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(noteData),
  });
  
  return response.data;
};

/**
 * Delete a calendar note
 * @param {number} courseId - Course ID
 * @param {number} noteId - Note ID
 * @returns {Promise<Object>} Success response
 */
export const deleteCalendarNote = async (courseId, noteId) => {
  const apiConfig = getApiConfig();
  const url = `${apiConfig.apiUrl}/quiz-extended/v1/courses/${courseId}/calendar-notes/${noteId}`;
  
  return makeApiRequest(url, { method: 'DELETE' });
};

export default {
  getCalendarNotes,
  createCalendarNote,
  updateCalendarNote,
  deleteCalendarNote,
};
