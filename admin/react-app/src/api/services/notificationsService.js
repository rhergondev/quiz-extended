import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Get the QE API base URL (qe/v1 namespace)
 */
const getQeApiUrl = () => {
  const { apiUrl } = getApiConfig();
  return `${apiUrl}/qe/v1`;
};

/**
 * Get notifications for a course
 * @param {number} courseId 
 * @param {Object} params - { page, per_page }
 * @returns {Promise}
 */
export const getCourseNotifications = async (courseId, params = {}) => {
  const { page = 1, per_page = 20 } = params;
  const baseUrl = getQeApiUrl();
  const url = `${baseUrl}/courses/${courseId}/notifications?page=${page}&per_page=${per_page}`;
  
  try {
    const response = await makeApiRequest(url, { method: 'GET' });
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Mark a single notification as read
 * @param {number} notificationId 
 * @returns {Promise}
 */
export const markNotificationAsRead = async (notificationId) => {
  const baseUrl = getQeApiUrl();
  const url = `${baseUrl}/notifications/${notificationId}/read`;
  
  try {
    const response = await makeApiRequest(url, { method: 'POST' });
    return response;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a course
 * @param {number} courseId 
 * @returns {Promise}
 */
export const markAllNotificationsAsRead = async (courseId) => {
  const baseUrl = getQeApiUrl();
  const url = `${baseUrl}/courses/${courseId}/notifications/read-all`;
  
  try {
    const response = await makeApiRequest(url, { method: 'POST' });
    return response;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Create a notification for a course (admin only)
 * @param {Object} data - { course_id, notification_type, title, message, related_object_id?, related_object_type? }
 * @returns {Promise}
 */
export const createNotification = async (data) => {
  const baseUrl = getQeApiUrl();
  const url = `${baseUrl}/notifications`;

  try {
    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a course
 * @param {number} courseId 
 * @returns {Promise}
 */
export const getUnreadNotificationCount = async (courseId) => {
  const baseUrl = getQeApiUrl();
  const url = `${baseUrl}/courses/${courseId}/notifications/unread-count`;
  
  try {
    const response = await makeApiRequest(url, { method: 'GET' });
    return response;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

export default {
  getCourseNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  createNotification,
};
