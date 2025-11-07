/**
 * User Utility Functions
 * Helpers for user role checking and permissions
 * 
 * @package QuizExtended
 * @subpackage Utils
 */

/**
 * Get current user data from WordPress
 * @returns {Object|null} User data or null if not logged in
 */
export const getCurrentUser = () => {
  return window.qe_data?.user || window.qeApiConfig?.user || null;
};

/**
 * Check if current user is logged in
 * @returns {boolean} True if user is logged in
 */
export const isUserLoggedIn = () => {
  const user = getCurrentUser();
  return user !== null && user.id > 0;
};

/**
 * Check if current user has administrator role
 * @returns {boolean} True if user is administrator
 */
export const isUserAdmin = () => {
  const user = getCurrentUser();
  
  if (!user) {
    return false;
  }

  // Check if user has admin capabilities
  // WordPress admins typically have 'manage_options' capability
  if (user.capabilities && user.capabilities.manage_options) {
    return true;
  }

  // Check if user has administrator role
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.includes('administrator');
  }

  return false;
};

/**
 * Check if current user has a specific capability
 * @param {string} capability - Capability to check
 * @returns {boolean} True if user has the capability
 */
export const userCan = (capability) => {
  const user = getCurrentUser();
  
  if (!user || !user.capabilities) {
    return false;
  }

  return user.capabilities[capability] === true;
};

/**
 * Check if current user has a specific role
 * @param {string} role - Role to check
 * @returns {boolean} True if user has the role
 */
export const userHasRole = (role) => {
  const user = getCurrentUser();
  
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }

  return user.roles.includes(role);
};

/**
 * Get current user ID
 * @returns {number} User ID or 0 if not logged in
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return user?.id || 0;
};

/**
 * Get current user display name
 * @returns {string} User display name or empty string
 */
export const getCurrentUserName = () => {
  const user = getCurrentUser();
  return user?.name || user?.display_name || '';
};

/**
 * Get current user email
 * @returns {string} User email or empty string
 */
export const getCurrentUserEmail = () => {
  const user = getCurrentUser();
  return user?.email || '';
};
