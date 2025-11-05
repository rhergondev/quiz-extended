<?php
/**
 * QE_Rate_Limiter Class
 *
 * Rate limiting and throttling system for Quiz Extended LMS.
 * Protects against brute force attacks, API abuse, and DOS attempts.
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

class QE_Rate_Limiter
{
    /**
     * The single instance of the class
     * * @var QE_Rate_Limiter
     */
    private static $instance = null;

    /**
     * Rate limit rules
     * * @var array
     */
    private $limits = [
        // 🔥 CORRECCIÓN: Aumentado el límite para evitar bloqueos al buscar en el admin.
        'api_general' => [
            'limit' => 300,         // Aumentado de 60 a 300 peticiones
            'window' => 60,         // por minuto
            'action' => 'throttle'
        ],
        'api_quiz_start' => [
            'limit' => 50,
            'window' => 300,        // 5 minutes
            'action' => 'block'
        ],
        'api_quiz_submit' => [
            'limit' => 40,
            'window' => 3600,       // 1 hour
            'action' => 'throttle'
        ],
        'api_create' => [
            'limit' => 30,
            'window' => 300,        // 5 minutes
            'action' => 'throttle'
        ],
        'api_delete' => [
            'limit' => 20,
            'window' => 300,
            'action' => 'block'
        ],
        // AJAX actions
        'ajax_search' => [
            'limit' => 30,
            'window' => 60,
            'action' => 'throttle'
        ],
        // Login attempts (handled by QE_Security, but included for reference)
        'login' => [
            'limit' => 5,
            'window' => 900,        // 15 minutes
            'action' => 'block'
        ],
    ];

    /**
     * Get single instance
     *
     * @return QE_Rate_Limiter
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
        // Check rate limits before REST request
        add_filter('rest_pre_dispatch', [$this, 'check_rest_rate_limit'], 5, 3);

        // Check rate limits for AJAX
        add_action('admin_init', [$this, 'check_ajax_rate_limit'], 5);

        // Clean up old transients daily
        if (!wp_next_scheduled('qe_cleanup_rate_limit_data')) {
            wp_schedule_event(time(), 'daily', 'qe_cleanup_rate_limit_data');
        }
        add_action('qe_cleanup_rate_limit_data', [$this, 'cleanup_old_data']);
    }

    // ============================================================
    // RATE LIMIT CHECKING
    // ============================================================

    /**
     * Check rate limit for REST API requests
     *
     * @param mixed $result Response to replace
     * @param WP_REST_Server $server Server instance
     * @param WP_REST_Request $request Request object
     * @return mixed
     */
    public function check_rest_rate_limit($result, $server, $request)
    {
        $route = $request->get_route();
        $method = $request->get_method();

        // Determine rate limit type based on route and method
        $limit_type = $this->get_limit_type_for_route($route, $method);

        if (!$limit_type) {
            return $result; // No rate limiting for this route
        }

        // 🔥 CORRECCIÓN: Asegurarse de que los administradores no sean bloqueados.
        if ($this->should_bypass($limit_type)) {
            return $result;
        }


        // Check if limit exceeded
        $check = $this->check_limit($limit_type, $this->get_identifier());

        if ($check['exceeded']) {
            $this->log_rate_limit_exceeded($limit_type, $check);

            return new WP_Error(
                'rate_limit_exceeded',
                sprintf(
                    __('Rate limit exceeded. Please try again in %d seconds.', 'quiz-extended'),
                    $check['retry_after']
                ),
                [
                    'status' => 429,
                    'headers' => [
                        'Retry-After' => $check['retry_after'],
                        'X-RateLimit-Limit' => $check['limit'],
                        'X-RateLimit-Remaining' => 0,
                        'X-RateLimit-Reset' => $check['reset_time']
                    ]
                ]
            );
        }

        // Add rate limit headers to response
        add_filter('rest_post_dispatch', function ($response) use ($check) {
            if ($response instanceof WP_REST_Response) {
                $response->header('X-RateLimit-Limit', $check['limit']);
                $response->header('X-RateLimit-Remaining', $check['remaining']);
                $response->header('X-RateLimit-Reset', $check['reset_time']);
            }
            return $response;
        });

        return $result;
    }

    /**
     * Check rate limit for AJAX requests
     */
    public function check_ajax_rate_limit()
    {
        if (!defined('DOING_AJAX') || !DOING_AJAX) {
            return;
        }

        $action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

        // Only check our AJAX actions
        if (strpos($action, 'qe_') !== 0) {
            return;
        }

        // Determine limit type
        $limit_type = 'ajax_search'; // Default for AJAX

        $check = $this->check_limit($limit_type, $this->get_identifier());

        if ($check['exceeded']) {
            $this->log_rate_limit_exceeded($limit_type, $check);

            wp_send_json_error([
                'message' => sprintf(
                    __('Rate limit exceeded. Please try again in %d seconds.', 'quiz-extended'),
                    $check['retry_after']
                )
            ], 429);
        }
    }

    /**
     * Check if rate limit is exceeded
     *
     * @param string $limit_type Type of rate limit
     * @param string $identifier Unique identifier (IP or user ID)
     * @return array Check results
     */
    public function check_limit($limit_type, $identifier)
    {
        if (!isset($this->limits[$limit_type])) {
            return [
                'exceeded' => false,
                'remaining' => 999,
                'limit' => 999,
                'reset_time' => time() + 3600
            ];
        }

        $config = $this->limits[$limit_type];
        $key = $this->get_rate_limit_key($limit_type, $identifier);

        // Get current count
        $data = get_transient($key);

        if ($data === false) {
            // First request in this window
            $data = [
                'count' => 1,
                'reset_time' => time() + $config['window']
            ];
            set_transient($key, $data, $config['window']);

            return [
                'exceeded' => false,
                'remaining' => $config['limit'] - 1,
                'limit' => $config['limit'],
                'reset_time' => $data['reset_time'],
                'retry_after' => 0
            ];
        }

        // Increment count
        $data['count']++;
        set_transient($key, $data, $config['window']);

        $exceeded = $data['count'] > $config['limit'];
        $remaining = max(0, $config['limit'] - $data['count']);
        $retry_after = $exceeded ? ($data['reset_time'] - time()) : 0;

        return [
            'exceeded' => $exceeded,
            'remaining' => $remaining,
            'limit' => $config['limit'],
            'reset_time' => $data['reset_time'],
            'retry_after' => max(0, $retry_after)
        ];
    }

    /**
     * Determine rate limit type for route
     *
     * @param string $route Route path
     * @param string $method HTTP method
     * @return string|false Limit type or false
     */
    private function get_limit_type_for_route($route, $method)
    {
        // ✅ EXEMPT: Quiz autosave from rate limiting - legitimate frequent operation
        if (strpos($route, '/quiz-autosave') !== false) {
            return false; // No rate limiting for autosave
        }

        // Quiz attempts - stricter limits
        if (strpos($route, '/quiz-attempts/start') !== false) {
            return 'api_quiz_start';
        }

        if (strpos($route, '/quiz-attempts/submit') !== false) {
            return 'api_quiz_submit';
        }

        // Create operations
        if ($method === 'POST' && !preg_match('#/\d+$#', $route)) {
            return 'api_create';
        }

        // Delete operations
        if ($method === 'DELETE') {
            return 'api_delete';
        }

        // General API limit for our endpoints
        if (
            strpos($route, '/wp/v2/qe_course') !== false ||
            strpos($route, '/wp/v2/qe_lesson') !== false ||
            strpos($route, '/wp/v2/qe_quiz') !== false ||
            strpos($route, '/wp/v2/qe_question') !== false ||
            strpos($route, '/quiz-extended/v1') !== false
        ) {
            return 'api_general';
        }

        return false; // No rate limiting
    }

    /**
     * Get unique identifier for rate limiting
     *
     * @return string Identifier (user ID or IP)
     */
    private function get_identifier()
    {
        if (is_user_logged_in()) {
            return 'user_' . get_current_user_id();
        }

        // Use IP for non-authenticated users
        return 'ip_' . $this->get_client_ip();
    }

    /**
     * Get client IP address
     *
     * @return string IP address
     */
    private function get_client_ip()
    {
        if (class_exists('QE_Security')) {
            return QE_Security::instance()->get_client_ip();
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return filter_var($ip, FILTER_VALIDATE_IP) ?: '0.0.0.0';
    }

    /**
     * Generate rate limit key
     *
     * @param string $limit_type Limit type
     * @param string $identifier Identifier
     * @return string Transient key
     */
    private function get_rate_limit_key($limit_type, $identifier)
    {
        return 'qe_rate_limit_' . $limit_type . '_' . md5($identifier);
    }

    // ============================================================
    // WHITELIST / BLACKLIST
    // ============================================================

    /**
     * Check if IP is whitelisted
     *
     * @param string $ip IP address
     * @return bool
     */
    public function is_whitelisted($ip)
    {
        $whitelist = get_option('qe_rate_limit_whitelist', []);
        return in_array($ip, $whitelist, true);
    }

    /**
     * Check if IP is blacklisted
     *
     * @param string $ip IP address
     * @return bool
     */
    public function is_blacklisted($ip)
    {
        $blacklist = get_option('qe_rate_limit_blacklist', []);
        return in_array($ip, $blacklist, true);
    }

    /**
     * Add IP to whitelist
     *
     * @param string $ip IP address
     * @return bool
     */
    public function add_to_whitelist($ip)
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        $whitelist = get_option('qe_rate_limit_whitelist', []);

        if (!in_array($ip, $whitelist, true)) {
            $whitelist[] = $ip;
            update_option('qe_rate_limit_whitelist', $whitelist);
        }

        return true;
    }

    /**
     * Add IP to blacklist
     *
     * @param string $ip IP address
     * @return bool
     */
    public function add_to_blacklist($ip)
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        $blacklist = get_option('qe_rate_limit_blacklist', []);

        if (!in_array($ip, $blacklist, true)) {
            $blacklist[] = $ip;
            update_option('qe_rate_limit_blacklist', $blacklist);
        }

        // Block immediately
        if ($this->get_client_ip() === $ip) {
            wp_die(
                __('Your IP address has been blocked due to suspicious activity.', 'quiz-extended'),
                __('Access Denied', 'quiz-extended'),
                ['response' => 403]
            );
        }

        return true;
    }

    // ============================================================
    // MAINTENANCE
    // ============================================================

    /**
     * Clean up old rate limit data
     */
    public function cleanup_old_data()
    {
        global $wpdb;

        // Delete expired transients
        $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_qe_rate_limit_%' 
             OR option_name LIKE '_transient_timeout_qe_rate_limit_%'"
        );

        $this->log_info('Rate limit data cleaned up');
    }

    /**
     * Get rate limit statistics
     *
     * @param string $limit_type Limit type (optional)
     * @return array Statistics
     */
    public function get_statistics($limit_type = null)
    {
        global $wpdb;

        $pattern = $limit_type
            ? "_transient_qe_rate_limit_{$limit_type}_%"
            : '_transient_qe_rate_limit_%';

        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT option_name, option_value 
             FROM {$wpdb->options} 
             WHERE option_name LIKE %s",
            $pattern
        ));

        $stats = [
            'total_active_limits' => count($results),
            'by_type' => [],
            'high_usage' => []
        ];

        foreach ($results as $row) {
            $data = maybe_unserialize($row->option_value);

            if (is_array($data) && isset($data['count'])) {
                // Extract type from option name
                if (preg_match('/_qe_rate_limit_([^_]+)_/', $row->option_name, $matches)) {
                    $type = $matches[1];

                    if (!isset($stats['by_type'][$type])) {
                        $stats['by_type'][$type] = [
                            'count' => 0,
                            'total_requests' => 0,
                            'avg_requests' => 0
                        ];
                    }

                    $stats['by_type'][$type]['count']++;
                    $stats['by_type'][$type]['total_requests'] += $data['count'];
                }

                // Track high usage
                if ($data['count'] > 50) {
                    $stats['high_usage'][] = [
                        'key' => $row->option_name,
                        'count' => $data['count'],
                        'reset_time' => $data['reset_time']
                    ];
                }
            }
        }

        // Calculate averages
        foreach ($stats['by_type'] as $type => &$type_stats) {
            if ($type_stats['count'] > 0) {
                $type_stats['avg_requests'] = round(
                    $type_stats['total_requests'] / $type_stats['count'],
                    2
                );
            }
        }

        return $stats;
    }

    /**
     * Get current rate limit status for identifier
     *
     * @param string $identifier Identifier (optional, defaults to current)
     * @return array Status for all limit types
     */
    public function get_status($identifier = null)
    {
        if ($identifier === null) {
            $identifier = $this->get_identifier();
        }

        $status = [];

        foreach ($this->limits as $type => $config) {
            $check = $this->check_limit($type, $identifier);

            $status[$type] = [
                'limit' => $config['limit'],
                'window' => $config['window'],
                'remaining' => $check['remaining'],
                'reset_time' => $check['reset_time'],
                'exceeded' => $check['exceeded']
            ];
        }

        return $status;
    }

    // ============================================================
    // LOGGING
    // ============================================================

    /**
     * Log rate limit exceeded event
     *
     * @param string $limit_type Limit type
     * @param array $check_data Check data
     */
    private function log_rate_limit_exceeded($limit_type, $check_data)
    {
        $data = [
            'limit_type' => $limit_type,
            'identifier' => $this->get_identifier(),
            'ip' => $this->get_client_ip(),
            'user_id' => get_current_user_id(),
            'limit' => $check_data['limit'],
            'count' => $check_data['limit'] + 1, // Exceeded by at least 1
            'route' => $_SERVER['REQUEST_URI'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ];

        // Log to audit log if available
        if (class_exists('QE_Audit_Log')) {
            QE_Audit_Log::instance()->log_event('rate_limit_exceeded', $data, 'security');
        }

        // Log to error log
        $this->log_info('Rate limit exceeded', $data);

        // Check if this is a potential attack (excessive violations)
        $this->check_for_attack_pattern($data);
    }

    /**
     * Check for attack patterns
     *
     * @param array $data Violation data
     */
    private function check_for_attack_pattern($data)
    {
        $violations_key = 'qe_rate_limit_violations_' . md5($data['identifier']);
        $violations = get_transient($violations_key);

        if ($violations === false) {
            $violations = 1;
        } else {
            $violations++;
        }

        set_transient($violations_key, $violations, HOUR_IN_SECONDS);

        // If more than 10 violations in 1 hour, add to blacklist and alert
        if ($violations >= 10) {
            $this->add_to_blacklist($data['ip']);

            // Send alert
            if (class_exists('QE_Security')) {
                $this->send_attack_alert($data);
            }

            $this->log_info('Potential attack detected, IP blacklisted', $data);
        }
    }

    /**
     * Send attack alert email
     *
     * @param array $data Attack data
     */
    private function send_attack_alert($data)
    {
        $admin_email = get_option('admin_email');

        $subject = sprintf(
            __('[%s] Security Alert: Potential Attack Detected', 'quiz-extended'),
            get_bloginfo('name')
        );

        $message = sprintf(
            __("A potential attack has been detected and blocked.\n\nDetails:\n- IP Address: %s\n- User ID: %s\n- Limit Type: %s\n- Violations: 10+\n- User Agent: %s\n\nThe IP has been automatically blacklisted.\n\nTime: %s", 'quiz-extended'),
            $data['ip'],
            $data['user_id'] ?: 'Not logged in',
            $data['limit_type'],
            $data['user_agent'],
            current_time('mysql')
        );

        wp_mail($admin_email, $subject, $message);
    }

    /**
     * Log info message
     *
     * @param string $message Message
     * @param array $context Context data
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Rate Limiter] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    // ============================================================
    // ADMIN INTERFACE HELPERS
    // ============================================================

    /**
     * Reset rate limits for identifier
     *
     * @param string $identifier Identifier
     * @return bool Success
     */
    public function reset_limits($identifier)
    {
        global $wpdb;

        $pattern = '_transient_qe_rate_limit_%_' . md5($identifier);

        $deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE %s",
            $pattern
        ));

        $this->log_info('Rate limits reset', [
            'identifier' => $identifier,
            'deleted' => $deleted
        ]);

        return $deleted !== false;
    }

    /**
     * Get recent violations
     *
     * @param int $limit Number of violations to retrieve
     * @return array Recent violations
     */
    public function get_recent_violations($limit = 50)
    {
        if (!class_exists('QE_Audit_Log')) {
            return [];
        }

        return QE_Audit_Log::instance()->get_events([
            'event_type' => 'rate_limit_exceeded',
            'limit' => $limit,
            'order' => 'DESC'
        ]);
    }

    /**
     * Update rate limit configuration
     *
     * @param string $limit_type Limit type
     * @param array $config New configuration
     * @return bool Success
     */
    public function update_limit_config($limit_type, $config)
    {
        if (!isset($this->limits[$limit_type])) {
            return false;
        }

        // Validate config
        if (!isset($config['limit']) || !isset($config['window']) || !isset($config['action'])) {
            return false;
        }

        if (!is_numeric($config['limit']) || !is_numeric($config['window'])) {
            return false;
        }

        if (!in_array($config['action'], ['throttle', 'block'])) {
            return false;
        }

        // Update in memory
        $this->limits[$limit_type] = [
            'limit' => absint($config['limit']),
            'window' => absint($config['window']),
            'action' => $config['action']
        ];

        // Persist to database
        $all_limits = get_option('qe_rate_limits', []);
        $all_limits[$limit_type] = $this->limits[$limit_type];
        update_option('qe_rate_limits', $all_limits);

        $this->log_info('Rate limit config updated', [
            'limit_type' => $limit_type,
            'config' => $config
        ]);

        return true;
    }

    /**
     * Load custom rate limit configurations
     */
    public function load_custom_configs()
    {
        $custom_limits = get_option('qe_rate_limits', []);

        if (!empty($custom_limits)) {
            $this->limits = array_merge($this->limits, $custom_limits);
        }
    }

    // ============================================================
    // BYPASS FOR SPECIFIC SITUATIONS
    // ============================================================

    /**
     * Check if rate limiting should be bypassed
     *
     * @param string $limit_type Limit type
     * @return bool True if should bypass
     */
    private function should_bypass($limit_type)
    {
        // Bypass for administrators in admin area
        if (is_admin() && current_user_can('manage_options')) {
            return true;
        }

        // Bypass for whitelisted IPs
        if ($this->is_whitelisted($this->get_client_ip())) {
            return true;
        }

        // Bypass for WP-CLI
        if (defined('WP_CLI') && WP_CLI) {
            return true;
        }

        // Bypass for localhost development
        if (in_array($this->get_client_ip(), ['127.0.0.1', '::1'])) {
            return apply_filters('qe_rate_limit_bypass_localhost', true);
        }

        return apply_filters('qe_rate_limit_bypass', false, $limit_type);
    }
}

// Initialize
QE_Rate_Limiter::instance();