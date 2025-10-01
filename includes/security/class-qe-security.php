<?php
/**
 * QE_Security Class
 *
 * Centralized security manager for Quiz Extended LMS.
 * Handles nonce management, CSRF protection, XSS prevention, and input validation.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Security
{
    /**
     * The single instance of the class
     * 
     * @var QE_Security
     */
    private static $instance = null;

    /**
     * Nonce action prefix
     * 
     * @var string
     */
    private const NONCE_PREFIX = 'qe_';

    /**
     * Nonce lifetime in seconds (12 hours)
     * 
     * @var int
     */
    private const NONCE_LIFETIME = 43200;

    /**
     * Maximum failed login attempts
     * 
     * @var int
     */
    private const MAX_LOGIN_ATTEMPTS = 5;

    /**
     * Login lockout duration in seconds (15 minutes)
     * 
     * @var int
     */
    private const LOCKOUT_DURATION = 900;

    /**
     * Get single instance
     *
     * @return QE_Security
     */
    public static function instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor - Register hooks
     */
    private function __construct()
    {
        // Security headers
        add_action('send_headers', [$this, 'add_security_headers']);

        // Nonce validation for AJAX
        add_action('wp_ajax_*', [$this, 'validate_ajax_nonce'], 1);

        // Enhanced nonce lifetime
        add_filter('nonce_life', [$this, 'set_nonce_lifetime']);

        // Login attempt monitoring
        add_action('wp_login_failed', [$this, 'log_failed_login_attempt']);
        add_filter('authenticate', [$this, 'check_login_attempts'], 30, 3);
        add_action('wp_login', [$this, 'clear_login_attempts'], 10, 2);
    }

    // ============================================================
    // NONCE MANAGEMENT
    // ============================================================

    /**
     * Create a nonce with custom action
     *
     * @param string $action Action name
     * @return string Nonce token
     */
    public function create_nonce($action = 'default')
    {
        $action = self::NONCE_PREFIX . $action;
        return wp_create_nonce($action);
    }

    /**
     * Verify nonce with custom action
     *
     * @param string $nonce Nonce to verify
     * @param string $action Action name
     * @return bool|int False if invalid, 1 or 2 if valid
     */
    public function verify_nonce($nonce, $action = 'default')
    {
        $action = self::NONCE_PREFIX . $action;
        return wp_verify_nonce($nonce, $action);
    }

    /**
     * Verify REST API nonce from request
     *
     * @param WP_REST_Request $request Request object
     * @return bool True if valid
     */
    public function verify_rest_nonce(WP_REST_Request $request)
    {
        $nonce = $request->get_header('X-WP-Nonce');

        if (empty($nonce)) {
            $nonce = $request->get_param('_wpnonce');
        }

        if (empty($nonce)) {
            $this->log_security_event('rest_nonce_missing', [
                'route' => $request->get_route(),
                'method' => $request->get_method()
            ]);
            return false;
        }

        $verified = wp_verify_nonce($nonce, 'wp_rest');

        if (!$verified) {
            $this->log_security_event('rest_nonce_invalid', [
                'route' => $request->get_route(),
                'method' => $request->get_method(),
                'user_id' => get_current_user_id()
            ]);
        }

        return (bool) $verified;
    }

    /**
     * Set custom nonce lifetime
     *
     * @return int Nonce lifetime in seconds
     */
    public function set_nonce_lifetime()
    {
        return self::NONCE_LIFETIME;
    }

    /**
     * Validate AJAX nonce
     */
    public function validate_ajax_nonce()
    {
        // Only validate our own AJAX actions
        $action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

        if (strpos($action, 'qe_') !== 0) {
            return; // Not our action
        }

        $nonce = isset($_REQUEST['nonce']) ? $_REQUEST['nonce'] : '';

        if (!$this->verify_nonce($nonce, $action)) {
            $this->log_security_event('ajax_nonce_invalid', [
                'action' => $action,
                'user_id' => get_current_user_id()
            ]);

            wp_send_json_error([
                'message' => __('Security check failed. Please refresh the page and try again.', 'quiz-extended')
            ], 403);
        }
    }

    // ============================================================
    // SECURITY HEADERS
    // ============================================================

    /**
     * Add security headers to responses
     */
    public function add_security_headers()
    {
        if (!is_admin()) {
            return;
        }

        // Prevent clickjacking
        header('X-Frame-Options: SAMEORIGIN');

        // XSS Protection
        header('X-XSS-Protection: 1; mode=block');

        // Prevent MIME sniffing
        header('X-Content-Type-Options: nosniff');

        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Content Security Policy (adjust as needed)
        $csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline';";
        header("Content-Security-Policy: {$csp}");
    }

    // ============================================================
    // INPUT VALIDATION & SANITIZATION
    // ============================================================

    /**
     * Validate and sanitize integer
     *
     * @param mixed $value Value to validate
     * @param int $min Minimum value
     * @param int $max Maximum value
     * @return int|false Sanitized integer or false
     */
    public function validate_int($value, $min = null, $max = null)
    {
        if (!is_numeric($value)) {
            return false;
        }

        $value = absint($value);

        if ($min !== null && $value < $min) {
            return false;
        }

        if ($max !== null && $value > $max) {
            return false;
        }

        return $value;
    }

    /**
     * Validate and sanitize string
     *
     * @param mixed $value Value to validate
     * @param int $max_length Maximum length
     * @param array $allowed_values Whitelist of allowed values
     * @return string|false Sanitized string or false
     */
    public function validate_string($value, $max_length = null, $allowed_values = null)
    {
        if (!is_string($value) && !is_numeric($value)) {
            return false;
        }

        $value = sanitize_text_field($value);

        if ($max_length !== null && strlen($value) > $max_length) {
            return false;
        }

        if ($allowed_values !== null && !in_array($value, $allowed_values, true)) {
            return false;
        }

        return $value;
    }

    /**
     * Validate email address
     *
     * @param string $email Email to validate
     * @return string|false Sanitized email or false
     */
    public function validate_email($email)
    {
        $email = sanitize_email($email);
        return is_email($email) ? $email : false;
    }

    /**
     * Validate URL
     *
     * @param string $url URL to validate
     * @param array $allowed_protocols Allowed protocols
     * @return string|false Sanitized URL or false
     */
    public function validate_url($url, $allowed_protocols = ['http', 'https'])
    {
        $url = esc_url_raw($url, $allowed_protocols);
        return filter_var($url, FILTER_VALIDATE_URL) ? $url : false;
    }

    /**
     * Validate array of integers
     *
     * @param mixed $array Array to validate
     * @return array|false Array of integers or false
     */
    public function validate_int_array($array)
    {
        if (!is_array($array)) {
            return false;
        }

        $validated = array_map('absint', $array);

        // Remove zeros (invalid IDs)
        $validated = array_filter($validated);

        return array_values($validated);
    }

    /**
     * Sanitize meta data based on type
     *
     * @param mixed $value Value to sanitize
     * @param string $type Data type (string, int, bool, array, json)
     * @return mixed Sanitized value
     */
    public function sanitize_meta($value, $type = 'string')
    {
        switch ($type) {
            case 'int':
            case 'integer':
                return absint($value);

            case 'bool':
            case 'boolean':
                return (bool) $value;

            case 'float':
            case 'decimal':
                return floatval($value);

            case 'array':
                return is_array($value) ? array_map('sanitize_text_field', $value) : [];

            case 'json':
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    return is_array($decoded) ? $decoded : [];
                }
                return is_array($value) ? $value : [];

            case 'email':
                return sanitize_email($value);

            case 'url':
                return esc_url_raw($value);

            case 'html':
                return wp_kses_post($value);

            case 'text':
            case 'string':
            default:
                return sanitize_text_field($value);
        }
    }

    // ============================================================
    // PERMISSION CHECKS
    // ============================================================

    /**
     * Check if user has capability
     *
     * @param string $capability Capability to check
     * @param int $user_id User ID (default: current user)
     * @return bool True if user has capability
     */
    public function user_can($capability, $user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        $user = get_user_by('id', $user_id);

        if (!$user) {
            return false;
        }

        return $user->has_cap($capability);
    }

    /**
     * Check if user owns a post
     *
     * @param int $post_id Post ID
     * @param int $user_id User ID (default: current user)
     * @return bool True if user owns the post
     */
    public function user_owns_post($post_id, $user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        $post = get_post($post_id);

        if (!$post) {
            return false;
        }

        return (int) $post->post_author === (int) $user_id;
    }

    /**
     * Check if user can edit a specific post
     *
     * @param int $post_id Post ID
     * @param int $user_id User ID (default: current user)
     * @return bool True if user can edit
     */
    public function user_can_edit_post($post_id, $user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        // Administrators can edit everything
        if ($this->user_can('manage_options', $user_id)) {
            return true;
        }

        $post = get_post($post_id);

        if (!$post) {
            return false;
        }

        // Check if user owns the post
        if ($this->user_owns_post($post_id, $user_id)) {
            return $this->user_can("edit_{$post->post_type}s", $user_id);
        }

        // Check if user can edit others' posts
        return $this->user_can("edit_others_{$post->post_type}s", $user_id);
    }

    // ============================================================
    // LOGIN ATTEMPT MONITORING
    // ============================================================

    /**
     * Log failed login attempt
     *
     * @param string $username Username
     */
    public function log_failed_login_attempt($username)
    {
        $ip = $this->get_client_ip();
        $attempts_key = 'qe_login_attempts_' . md5($ip);
        $lockout_key = 'qe_login_lockout_' . md5($ip);

        // Check if already locked out
        if (get_transient($lockout_key)) {
            return;
        }

        // Get current attempts
        $attempts = get_transient($attempts_key);
        $attempts = $attempts ? (int) $attempts : 0;
        $attempts++;

        // Store attempts (expires in 1 hour)
        set_transient($attempts_key, $attempts, HOUR_IN_SECONDS);

        // Log the attempt
        $this->log_security_event('login_failed', [
            'username' => $username,
            'ip' => $ip,
            'attempts' => $attempts
        ]);

        // Check if lockout threshold reached
        if ($attempts >= self::MAX_LOGIN_ATTEMPTS) {
            set_transient($lockout_key, true, self::LOCKOUT_DURATION);

            $this->log_security_event('login_locked_out', [
                'username' => $username,
                'ip' => $ip,
                'attempts' => $attempts
            ]);

            // Send alert email to admin
            $this->send_security_alert('login_lockout', [
                'username' => $username,
                'ip' => $ip,
                'attempts' => $attempts
            ]);
        }
    }

    /**
     * Check login attempts before authentication
     *
     * @param WP_User|WP_Error|null $user User object or error
     * @param string $username Username
     * @param string $password Password
     * @return WP_User|WP_Error User object or error
     */
    public function check_login_attempts($user, $username, $password)
    {
        // Skip if already an error
        if (is_wp_error($user)) {
            return $user;
        }

        $ip = $this->get_client_ip();
        $lockout_key = 'qe_login_lockout_' . md5($ip);

        if (get_transient($lockout_key)) {
            $remaining = get_option('_transient_timeout_' . $lockout_key) - time();

            return new WP_Error(
                'login_locked_out',
                sprintf(
                    __('Too many failed login attempts. Please try again in %d minutes.', 'quiz-extended'),
                    ceil($remaining / 60)
                )
            );
        }

        return $user;
    }

    /**
     * Clear login attempts on successful login
     *
     * @param string $username Username
     * @param WP_User $user User object
     */
    public function clear_login_attempts($username, $user)
    {
        $ip = $this->get_client_ip();
        $attempts_key = 'qe_login_attempts_' . md5($ip);
        $lockout_key = 'qe_login_lockout_' . md5($ip);

        delete_transient($attempts_key);
        delete_transient($lockout_key);

        $this->log_security_event('login_success', [
            'user_id' => $user->ID,
            'username' => $username,
            'ip' => $ip
        ]);
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Get client IP address
     *
     * @return string IP address
     */
    public function get_client_ip()
    {
        $ip = '';

        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'];
        }

        // Validate IP
        $ip = filter_var($ip, FILTER_VALIDATE_IP);

        return $ip ? $ip : '0.0.0.0';
    }

    /**
     * Log security event
     *
     * @param string $event_type Event type
     * @param array $data Event data
     */
    private function log_security_event($event_type, $data = [])
    {
        if (class_exists('QE_Audit_Log')) {
            QE_Audit_Log::instance()->log_event($event_type, $data, 'security');
        }

        // Also log to error log if WP_DEBUG is enabled
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Security] %s | Data: %s',
                $event_type,
                json_encode($data)
            ));
        }
    }

    /**
     * Send security alert email to admin
     *
     * @param string $alert_type Alert type
     * @param array $data Alert data
     */
    private function send_security_alert($alert_type, $data = [])
    {
        $admin_email = get_option('admin_email');

        $subject = sprintf(
            __('[%s] Security Alert: %s', 'quiz-extended'),
            get_bloginfo('name'),
            $alert_type
        );

        $message = sprintf(
            __("A security event has occurred on your site:\n\nEvent Type: %s\nTime: %s\nDetails: %s\n\nThis is an automated security notification.", 'quiz-extended'),
            $alert_type,
            current_time('mysql'),
            print_r($data, true)
        );

        wp_mail($admin_email, $subject, $message);
    }
}

// Initialize
QE_Security::instance();