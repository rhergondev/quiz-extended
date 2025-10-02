// admin/react-app/src/api/services/mediaService.js

/**
 * Media Service
 * 
 * Handles media uploads and management with WordPress Media Library
 * 
 * @package QuizExtended
 * @subpackage Admin/ReactApp/API/Services
 * @version 1.0.0
 */

/**
 * Get WordPress configuration
 * @returns {Object} WordPress config from window.qe_data
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found. Ensure qe_data is loaded.');
  }
  
  if (!config.api_url) {
    throw new Error('API URL not configured in WordPress');
  }
  
  return config;
};

/**
 * Upload a file to WordPress Media Library
 * 
 * @param {File} file - File object to upload
 * @param {Object} options - Upload options
 * @param {string} options.title - Media title
 * @param {string} options.alt_text - Alt text for image
 * @param {string} options.caption - Media caption
 * @param {Function} options.onProgress - Progress callback (percentage)
 * @returns {Promise<Object>} Uploaded media object with ID and URL
 */
export const uploadMedia = async (file, options = {}) => {
  try {
    const config = getWpConfig();
    const {
      title = file.name,
      alt_text = '',
      caption = '',
      onProgress = null
    } = options;

    console.log('📤 Uploading media:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    
    if (title) {
      formData.append('title', title);
    }
    
    if (alt_text) {
      formData.append('alt_text', alt_text);
    }
    
    if (caption) {
      formData.append('caption', caption);
    }

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise((resolve, reject) => {
      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            onProgress(percentComplete);
          }
        });
      }

      // Success
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('✅ Media uploaded successfully:', response.id);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Send request
      xhr.open('POST', `${config.api_url}/wp/v2/media`);
      xhr.setRequestHeader('X-WP-Nonce', config.nonce);
      xhr.send(formData);
    });

    const media = await uploadPromise;

    return {
      id: media.id,
      url: media.source_url,
      title: media.title?.rendered || media.title,
      alt: media.alt_text || '',
      caption: media.caption?.rendered || media.caption,
      mediaDetails: media.media_details,
      mimeType: media.mime_type
    };

  } catch (error) {
    console.error('❌ Error uploading media:', error);
    throw error;
  }
};

/**
 * Get media item by ID
 * 
 * @param {number} mediaId - Media ID
 * @returns {Promise<Object>} Media object
 */
export const getMedia = async (mediaId) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/media/${mediaId}`;
    
    console.log(`🔍 Fetching media #${mediaId}`);

    const response = await fetch(url, {
      headers: {
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }

    const media = await response.json();

    console.log('✅ Media fetched:', media.source_url);

    return {
      id: media.id,
      url: media.source_url,
      title: media.title?.rendered || media.title,
      alt: media.alt_text || '',
      caption: media.caption?.rendered || media.caption,
      mediaDetails: media.media_details,
      mimeType: media.mime_type
    };

  } catch (error) {
    console.error(`❌ Error fetching media #${mediaId}:`, error);
    throw error;
  }
};

/**
 * Delete media item
 * 
 * @param {number} mediaId - Media ID
 * @param {boolean} force - Force delete (default: true)
 * @returns {Promise<boolean>} Success status
 */
export const deleteMedia = async (mediaId, force = true) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/media/${mediaId}?force=${force}`;
    
    console.log(`🗑️ Deleting media #${mediaId}`);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete media: ${response.statusText}`);
    }

    console.log('✅ Media deleted successfully');

    return true;

  } catch (error) {
    console.error(`❌ Error deleting media #${mediaId}:`, error);
    throw error;
  }
};

/**
 * Update media metadata
 * 
 * @param {number} mediaId - Media ID
 * @param {Object} metadata - Metadata to update
 * @param {string} metadata.title - Media title
 * @param {string} metadata.alt_text - Alt text
 * @param {string} metadata.caption - Caption
 * @returns {Promise<Object>} Updated media object
 */
export const updateMedia = async (mediaId, metadata) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/media/${mediaId}`;
    
    console.log(`✏️ Updating media #${mediaId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      throw new Error(`Failed to update media: ${response.statusText}`);
    }

    const media = await response.json();

    console.log('✅ Media updated successfully');

    return {
      id: media.id,
      url: media.source_url,
      title: media.title?.rendered || media.title,
      alt: media.alt_text || '',
      caption: media.caption?.rendered || media.caption
    };

  } catch (error) {
    console.error(`❌ Error updating media #${mediaId}:`, error);
    throw error;
  }
};

/**
 * Validate file before upload
 * 
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSize - Max file size in bytes (default: 5MB)
 * @param {Array<string>} options.allowedTypes - Allowed MIME types
 * @returns {Object} Validation result {isValid, error}
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  } = options;

  // Check if file exists
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return { 
      isValid: false, 
      error: `File size exceeds ${maxSizeMB}MB limit` 
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  return { isValid: true };
};

/**
 * Create a preview URL for a file (for local preview before upload)
 * 
 * @param {File} file - File to preview
 * @returns {Promise<string>} Data URL for preview
 */
export const createPreviewUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      resolve(reader.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};