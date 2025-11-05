<?php
/**
 * QE_Step_Sanitizer Class
 *
 * Sanitizes lesson step data based on step type
 * Provides type-specific sanitization for video, quiz, text, pdf, image, audio
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/validators
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Step_Sanitizer
{
    /**
     * Valid step types
     *
     * @var array
     */
    private $valid_types = ['video', 'text', 'pdf', 'quiz', 'image', 'audio'];

    /**
     * Sanitize step data based on type
     *
     * @param array $data Step data
     * @param string $type Step type
     * @return array Sanitized data
     */
    public function sanitize($data, $type)
    {
        if (!is_array($data)) {
            return [];
        }

        // Ensure valid type
        if (!in_array($type, $this->valid_types)) {
            $type = 'text';
        }

        // Call type-specific sanitization method
        $method = 'sanitize_' . $type . '_step';

        if (method_exists($this, $method)) {
            return $this->$method($data);
        }

        return $this->sanitize_default_step($data);
    }

    // ============================================================
    // TYPE-SPECIFIC SANITIZATION
    // ============================================================

    /**
     * Sanitize video step data
     *
     * @param array $data Video step data
     * @return array Sanitized data
     */
    private function sanitize_video_step($data)
    {
        $sanitized = [];

        // URL
        if (isset($data['video_url'])) {
            $sanitized['video_url'] = esc_url_raw($data['video_url']);
        }

        // Video ID (attachment ID)
        if (isset($data['video_id'])) {
            $video_id = absint($data['video_id']);
            if ($video_id > 0 && $this->validate_attachment($video_id, 'video')) {
                $sanitized['video_id'] = $video_id;
            }
        }

        // Provider (youtube, vimeo, self-hosted, etc.)
        if (isset($data['provider'])) {
            $sanitized['provider'] = sanitize_text_field($data['provider']);
        }

        // Duration in seconds
        if (isset($data['duration'])) {
            $sanitized['duration'] = absint($data['duration']);
        }

        // Thumbnail URL
        if (isset($data['thumbnail'])) {
            $sanitized['thumbnail'] = esc_url_raw($data['thumbnail']);
        }

        // Additional video metadata
        if (isset($data['width'])) {
            $sanitized['width'] = absint($data['width']);
        }

        if (isset($data['height'])) {
            $sanitized['height'] = absint($data['height']);
        }

        return $sanitized;
    }

    /**
     * Sanitize quiz step data
     *
     * @param array $data Quiz step data
     * @return array Sanitized data
     */
    private function sanitize_quiz_step($data)
    {
        $sanitized = [];

        // Quiz ID
        if (isset($data['quiz_id'])) {
            $quiz_id = absint($data['quiz_id']);

            // Validate quiz exists
            if ($quiz_id > 0 && get_post_type($quiz_id) === 'qe_quiz') {
                $sanitized['quiz_id'] = $quiz_id;
            }
        }

        // Passing score (0-100)
        if (isset($data['passing_score'])) {
            $score = absint($data['passing_score']);
            $sanitized['passing_score'] = min(100, max(0, $score));
        }

        // Max attempts (0 = unlimited)
        if (isset($data['max_attempts'])) {
            $sanitized['max_attempts'] = absint($data['max_attempts']);
        }

        // Time limit in minutes
        if (isset($data['time_limit'])) {
            $sanitized['time_limit'] = absint($data['time_limit']);
        }

        // Show results after completion
        if (isset($data['show_results'])) {
            $sanitized['show_results'] = (bool) $data['show_results'];
        }

        return $sanitized;
    }

    /**
     * Sanitize text step data
     *
     * @param array $data Text step data
     * @return array Sanitized data
     */
    private function sanitize_text_step($data)
    {
        $sanitized = [];

        // Content (allows HTML)
        if (isset($data['content'])) {
            $sanitized['content'] = wp_kses_post($data['content']);
        }

        // Format (html, markdown, plain)
        if (isset($data['format'])) {
            $valid_formats = ['html', 'markdown', 'plain'];
            $format = sanitize_text_field($data['format']);
            $sanitized['format'] = in_array($format, $valid_formats) ? $format : 'html';
        }

        return $sanitized;
    }

    /**
     * Sanitize PDF step data
     *
     * @param array $data PDF step data
     * @return array Sanitized data
     */
    private function sanitize_pdf_step($data)
    {
        $sanitized = [];

        // File ID (attachment ID)
        if (isset($data['file_id'])) {
            $file_id = absint($data['file_id']);
            if ($file_id > 0 && $this->validate_attachment($file_id, 'application/pdf')) {
                $sanitized['file_id'] = $file_id;
            }
        }

        // URL (for external PDFs)
        if (isset($data['url'])) {
            $sanitized['url'] = esc_url_raw($data['url']);
        }

        // Filename
        if (isset($data['filename'])) {
            $sanitized['filename'] = sanitize_file_name($data['filename']);
        }

        // File size in bytes
        if (isset($data['filesize'])) {
            $sanitized['filesize'] = absint($data['filesize']);
        }

        // Number of pages
        if (isset($data['pages'])) {
            $sanitized['pages'] = absint($data['pages']);
        }

        // Allow download
        if (isset($data['allow_download'])) {
            $sanitized['allow_download'] = (bool) $data['allow_download'];
        }

        return $sanitized;
    }

    /**
     * Sanitize image step data
     *
     * @param array $data Image step data
     * @return array Sanitized data
     */
    private function sanitize_image_step($data)
    {
        $sanitized = [];

        // Image ID (attachment ID)
        if (isset($data['image_id'])) {
            $image_id = absint($data['image_id']);
            if ($image_id > 0 && $this->validate_attachment($image_id, 'image')) {
                $sanitized['image_id'] = $image_id;
            }
        }

        // URL
        if (isset($data['url'])) {
            $sanitized['url'] = esc_url_raw($data['url']);
        }

        // Alt text
        if (isset($data['alt'])) {
            $sanitized['alt'] = sanitize_text_field($data['alt']);
        }

        // Caption
        if (isset($data['caption'])) {
            $sanitized['caption'] = sanitize_text_field($data['caption']);
        }

        // Dimensions
        if (isset($data['width'])) {
            $sanitized['width'] = absint($data['width']);
        }

        if (isset($data['height'])) {
            $sanitized['height'] = absint($data['height']);
        }

        // Link to URL
        if (isset($data['link'])) {
            $sanitized['link'] = esc_url_raw($data['link']);
        }

        return $sanitized;
    }

    /**
     * Sanitize audio step data
     *
     * @param array $data Audio step data
     * @return array Sanitized data
     */
    private function sanitize_audio_step($data)
    {
        $sanitized = [];

        // Audio ID (attachment ID)
        if (isset($data['audio_id'])) {
            $audio_id = absint($data['audio_id']);
            if ($audio_id > 0 && $this->validate_attachment($audio_id, 'audio')) {
                $sanitized['audio_id'] = $audio_id;
            }
        }

        // URL
        if (isset($data['url'])) {
            $sanitized['url'] = esc_url_raw($data['url']);
        }

        // Duration in seconds
        if (isset($data['duration'])) {
            $sanitized['duration'] = absint($data['duration']);
        }

        // Title/name
        if (isset($data['title'])) {
            $sanitized['title'] = sanitize_text_field($data['title']);
        }

        // Artist/author
        if (isset($data['artist'])) {
            $sanitized['artist'] = sanitize_text_field($data['artist']);
        }

        // Transcript
        if (isset($data['transcript'])) {
            $sanitized['transcript'] = wp_kses_post($data['transcript']);
        }

        return $sanitized;
    }

    /**
     * Sanitize default/unknown step type data
     *
     * @param array $data Step data
     * @return array Sanitized data
     */
    private function sanitize_default_step($data)
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            $sanitized_key = sanitize_key($key);

            if (is_string($value)) {
                $sanitized[$sanitized_key] = sanitize_text_field($value);
            } elseif (is_numeric($value)) {
                $sanitized[$sanitized_key] = is_float($value) ? floatval($value) : absint($value);
            } elseif (is_bool($value)) {
                $sanitized[$sanitized_key] = (bool) $value;
            } elseif (is_array($value)) {
                $sanitized[$sanitized_key] = array_map('sanitize_text_field', $value);
            }
        }

        return $sanitized;
    }

    // ============================================================
    // VALIDATION HELPERS
    // ============================================================

    /**
     * Validate attachment exists and is of correct type
     *
     * @param int $attachment_id Attachment ID
     * @param string $type Expected mime type or type prefix
     * @return bool True if valid
     */
    private function validate_attachment($attachment_id, $type)
    {
        $attachment = get_post($attachment_id);

        if (!$attachment || $attachment->post_type !== 'attachment') {
            return false;
        }

        // Get mime type
        $mime_type = get_post_mime_type($attachment_id);

        if (!$mime_type) {
            return false;
        }

        // Check if mime type matches expected type
        if ($type === 'video' || $type === 'audio' || $type === 'image') {
            return strpos($mime_type, $type . '/') === 0;
        }

        return $mime_type === $type;
    }

    /**
     * Log sanitization warning
     *
     * @param string $message Warning message
     * @param array $context Context data
     * @return void
     */
    private function log_warning($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Step Sanitizer] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}