<?php
/**
 * QE_Audit_Log Class
 *
 * Comprehensive audit logging system for Quiz Extended LMS.
 * Tracks all security events, user actions, and system changes.
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

class QE_Audit_Log
{
    /**
     * The single instance of the class
     * 
     * @var QE_Audit_Log
     */
    private static $instance = null;

    /**
     * Database table name
     * 
     * @var string
     */
    private $table_name;

    /**
     * Event categories
     * 
     * @var array
     */
    private $categories = [
        'security',      // Security events (login, permissions, etc.)
        'user',          // User actions (enroll, submit, etc.)
        'content',       // Content changes (create, edit, delete)
        'admin',         // Admin actions
        'system',        // System events
        'api'            // API calls
    ];

    /**
     * Get single instance
     *
     * @return QE_Audit_Log
     */
    public static function instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor - Register hooks and create table
     */
    private function __construct()
    {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'qe_audit_log';

        // Create table on activation
        add_action('init', [$this, 'maybe_create_table']);

        // Hook into WordPress actions for automatic logging
        $this->register_auto_logging_hooks();

        // Cleanup old logs
        if (!wp_next_scheduled('qe_cleanup_audit_logs')) {
            wp_schedule_event(time(), 'weekly', 'qe_cleanup_audit_logs');
        }
        add_action('qe_cleanup_audit_logs', [$this, 'cleanup_old_logs']);
    }

    // ============================================================
    // DATABASE MANAGEMENT
    // ============================================================

    /**
     * Create audit log table if it doesn't exist
     */
    public function maybe_create_table()
    {
        if ($this->table_exists()) {
            return;
        }

        $this->create_table();
    }

    /**
     * Check if table exists
     *
     * @return bool
     */
    private function table_exists()
    {
        global $wpdb;

        $query = $wpdb->prepare(
            'SHOW TABLES LIKE %s',
            $wpdb->esc_like($this->table_name)
        );

        return $wpdb->get_var($query) === $this->table_name;
    }

    /**
     * Create audit log table
     */
    private function create_table()
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$this->table_name} (
            log_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            event_type VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL DEFAULT 'system',
            user_id BIGINT(20) UNSIGNED NULL,
            ip_address VARCHAR(45) NOT NULL,
            user_agent TEXT,
            event_data LONGTEXT,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (log_id),
            KEY event_type (event_type),
            KEY category (category),
            KEY user_id (user_id),
            KEY created_at (created_at),
            KEY ip_address (ip_address)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        // Verify table creation
        if ($this->table_exists()) {
            $this->log_system_event('audit_table_created');
        }
    }

    // ============================================================
    // LOGGING METHODS
    // ============================================================

    /**
     * Log an event
     *
     * @param string $event_type Event type identifier
     * @param array $event_data Event data
     * @param string $category Event category
     * @param int $user_id User ID (optional, defaults to current user)
     * @return int|false Log ID or false on failure
     */
    public function log_event($event_type, $event_data = [], $category = 'system', $user_id = null)
    {
        global $wpdb;

        // Validate category
        if (!in_array($category, $this->categories)) {
            $category = 'system';
        }

        // Get user ID
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        // Get client info
        $ip_address = $this->get_client_ip();
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

        // Prepare event data
        $event_data = $this->sanitize_event_data($event_data);

        // Insert log entry
        $result = $wpdb->insert(
            $this->table_name,
            [
                'event_type' => sanitize_key($event_type),
                'category' => $category,
                'user_id' => $user_id ?: null,
                'ip_address' => $ip_address,
                'user_agent' => $user_agent,
                'event_data' => wp_json_encode($event_data),
                'created_at' => current_time('mysql', 1)
            ],
            ['%s', '%s', '%d', '%s', '%s', '%s', '%s']
        );

        if ($result === false) {
            error_log('[Quiz Extended Audit] Failed to log event: ' . $event_type);
            return false;
        }

        return $wpdb->insert_id;
    }

    /**
     * Log security event
     *
     * @param string $event_type Event type
     * @param array $event_data Event data
     * @return int|false Log ID
     */
    public function log_security_event($event_type, $event_data = [])
    {
        return $this->log_event($event_type, $event_data, 'security');
    }

    /**
     * Log user action
     *
     * @param string $event_type Event type
     * @param array $event_data Event data
     * @param int $user_id User ID
     * @return int|false Log ID
     */
    public function log_user_action($event_type, $event_data = [], $user_id = null)
    {
        return $this->log_event($event_type, $event_data, 'user', $user_id);
    }

    /**
     * Log content change
     *
     * @param string $event_type Event type
     * @param array $event_data Event data
     * @return int|false Log ID
     */
    public function log_content_change($event_type, $event_data = [])
    {
        return $this->log_event($event_type, $event_data, 'content');
    }

    /**
     * Log admin action
     *
     * @param string $event_type Event type
     * @param array $event_data Event data
     * @return int|false Log ID
     */
    public function log_admin_action($event_type, $event_data = [])
    {
        return $this->log_event($event_type, $event_data, 'admin');
    }

    /**
     * Log API call
     *
     * @param string $endpoint Endpoint called
     * @param array $event_data Event data
     * @return int|false Log ID
     */
    public function log_api_call($endpoint, $event_data = [])
    {
        $event_data['endpoint'] = $endpoint;
        return $this->log_event('api_call', $event_data, 'api');
    }

    /**
     * Log system event
     *
     * @param string $event_type Event type
     * @param array $event_data Event data
     * @return int|false Log ID
     */
    private function log_system_event($event_type, $event_data = [])
    {
        return $this->log_event($event_type, $event_data, 'system', 0);
    }

    // ============================================================
    // AUTO-LOGGING HOOKS
    // ============================================================

    /**
     * Register hooks for automatic logging
     */
    private function register_auto_logging_hooks()
    {
        // User actions
        add_action('qe_user_enrolled', [$this, 'log_user_enrollment'], 10, 2);
        add_action('qe_user_unenrolled', [$this, 'log_user_unenrollment'], 10, 2);
        add_action('qe_quiz_attempt_started', [$this, 'log_quiz_attempt_start'], 10, 2);
        add_action('qe_quiz_attempt_submitted', [$this, 'log_quiz_attempt_submit'], 10, 3);

        // Content changes
        add_action('transition_post_status', [$this, 'log_post_status_change'], 10, 3);
        add_action('deleted_post', [$this, 'log_post_deletion'], 10, 2);

        // User meta changes (enrollment, progress)
        add_action('updated_user_meta', [$this, 'log_user_meta_change'], 10, 4);
    }

    /**
     * Log user enrollment
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     */
    public function log_user_enrollment($user_id, $course_id)
    {
        $this->log_user_action('course_enrolled', [
            'course_id' => $course_id,
            'course_title' => get_the_title($course_id)
        ], $user_id);
    }

    /**
     * Log user unenrollment
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     */
    public function log_user_unenrollment($user_id, $course_id)
    {
        $this->log_user_action('course_unenrolled', [
            'course_id' => $course_id,
            'course_title' => get_the_title($course_id)
        ], $user_id);
    }

    /**
     * Log quiz attempt start
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     */
    public function log_quiz_attempt_start($user_id, $quiz_id)
    {
        $this->log_user_action('quiz_attempt_started', [
            'quiz_id' => $quiz_id,
            'quiz_title' => get_the_title($quiz_id)
        ], $user_id);
    }

    /**
     * Log quiz attempt submission
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @param array $results Results data
     */
    public function log_quiz_attempt_submit($user_id, $quiz_id, $results)
    {
        $this->log_user_action('quiz_attempt_submitted', [
            'quiz_id' => $quiz_id,
            'quiz_title' => get_the_title($quiz_id),
            'score' => $results['score'] ?? 0,
            'passed' => $results['passed'] ?? false
        ], $user_id);
    }

    /**
     * Log post status change
     *
     * @param string $new_status New status
     * @param string $old_status Old status
     * @param WP_Post $post Post object
     */
    public function log_post_status_change($new_status, $old_status, $post)
    {
        // Only log our custom post types
        if (!in_array($post->post_type, ['qe_course', 'qe_lesson', 'qe_quiz', 'qe_question'])) {
            return;
        }

        // Skip auto-drafts
        if ($old_status === 'auto-draft') {
            return;
        }

        $this->log_content_change('post_status_changed', [
            'post_id' => $post->ID,
            'post_type' => $post->post_type,
            'post_title' => $post->post_title,
            'old_status' => $old_status,
            'new_status' => $new_status
        ]);
    }

    /**
     * Log post deletion
     *
     * @param int $post_id Post ID
     * @param WP_Post $post Post object
     */
    public function log_post_deletion($post_id, $post)
    {
        // Only log our custom post types
        if (!in_array($post->post_type, ['qe_course', 'qe_lesson', 'qe_quiz', 'qe_question'])) {
            return;
        }

        $this->log_content_change('post_deleted', [
            'post_id' => $post_id,
            'post_type' => $post->post_type,
            'post_title' => $post->post_title
        ]);
    }

    /**
     * Log user meta changes (for enrollment tracking)
     * OPTIMIZED: Only log enrollment changes, not progress updates
     * Progress updates are too frequent and would bloat the audit log
     *
     * @param int $meta_id Meta ID
     * @param int $user_id User ID
     * @param string $meta_key Meta key
     * @param mixed $meta_value Meta value
     */
    public function log_user_meta_change($meta_id, $user_id, $meta_key, $meta_value)
    {
        // ONLY log enrollment changes (not progress or activity updates)
        // This prevents audit log bloat from frequent progress updates
        if (strpos($meta_key, '_enrolled_course_') !== 0) {
            return;
        }

        // Skip date and order_id meta (only log main enrollment)
        if (strpos($meta_key, '_date') !== false || strpos($meta_key, '_order_id') !== false) {
            return;
        }

        $this->log_user_action('user_meta_updated', [
            'meta_key' => $meta_key,
            'meta_value' => is_scalar($meta_value) ? $meta_value : 'complex_value'
        ], $user_id);
    }

    // ============================================================
    // QUERY METHODS
    // ============================================================

    /**
     * Get events from audit log
     *
     * @param array $args Query arguments
     * @return array Events
     */
    public function get_events($args = [])
    {
        global $wpdb;

        $defaults = [
            'event_type' => null,
            'category' => null,
            'user_id' => null,
            'ip_address' => null,
            'date_from' => null,
            'date_to' => null,
            'limit' => 100,
            'offset' => 0,
            'order' => 'DESC'
        ];

        $args = wp_parse_args($args, $defaults);

        // Build WHERE clause
        $where = ['1=1'];
        $params = [];

        if ($args['event_type']) {
            $where[] = 'event_type = %s';
            $params[] = $args['event_type'];
        }

        if ($args['category']) {
            $where[] = 'category = %s';
            $params[] = $args['category'];
        }

        if ($args['user_id']) {
            $where[] = 'user_id = %d';
            $params[] = $args['user_id'];
        }

        if ($args['ip_address']) {
            $where[] = 'ip_address = %s';
            $params[] = $args['ip_address'];
        }

        if ($args['date_from']) {
            $where[] = 'created_at >= %s';
            $params[] = $args['date_from'];
        }

        if ($args['date_to']) {
            $where[] = 'created_at <= %s';
            $params[] = $args['date_to'];
        }

        $where_clause = implode(' AND ', $where);

        // Build ORDER BY
        $order = in_array(strtoupper($args['order']), ['ASC', 'DESC'])
            ? strtoupper($args['order'])
            : 'DESC';

        // Build LIMIT
        $limit = absint($args['limit']);
        $offset = absint($args['offset']);

        // Build query
        $query = "SELECT * FROM {$this->table_name} 
                  WHERE {$where_clause} 
                  ORDER BY created_at {$order} 
                  LIMIT {$limit} OFFSET {$offset}";

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        $results = $wpdb->get_results($query, ARRAY_A);

        // Decode event data
        foreach ($results as &$result) {
            $result['event_data'] = json_decode($result['event_data'], true);
        }

        return $results;
    }

    /**
     * Get event count
     *
     * @param array $args Query arguments
     * @return int Count
     */
    public function get_event_count($args = [])
    {
        global $wpdb;

        $defaults = [
            'event_type' => null,
            'category' => null,
            'user_id' => null,
            'date_from' => null,
            'date_to' => null
        ];

        $args = wp_parse_args($args, $defaults);

        // Build WHERE clause
        $where = ['1=1'];
        $params = [];

        if ($args['event_type']) {
            $where[] = 'event_type = %s';
            $params[] = $args['event_type'];
        }

        if ($args['category']) {
            $where[] = 'category = %s';
            $params[] = $args['category'];
        }

        if ($args['user_id']) {
            $where[] = 'user_id = %d';
            $params[] = $args['user_id'];
        }

        if ($args['date_from']) {
            $where[] = 'created_at >= %s';
            $params[] = $args['date_from'];
        }

        if ($args['date_to']) {
            $where[] = 'created_at <= %s';
            $params[] = $args['date_to'];
        }

        $where_clause = implode(' AND ', $where);

        $query = "SELECT COUNT(*) FROM {$this->table_name} WHERE {$where_clause}";

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        return (int) $wpdb->get_var($query);
    }

    /**
     * Get event statistics
     *
     * @param string $groupby Group by field (event_type, category, user_id, ip_address)
     * @param array $args Additional query arguments
     * @return array Statistics
     */
    public function get_statistics($groupby = 'event_type', $args = [])
    {
        global $wpdb;

        $allowed_groupby = ['event_type', 'category', 'user_id', 'ip_address'];

        if (!in_array($groupby, $allowed_groupby)) {
            $groupby = 'event_type';
        }

        $defaults = [
            'date_from' => null,
            'date_to' => null
        ];

        $args = wp_parse_args($args, $defaults);

        // Build WHERE clause
        $where = ['1=1'];
        $params = [];

        if ($args['date_from']) {
            $where[] = 'created_at >= %s';
            $params[] = $args['date_from'];
        }

        if ($args['date_to']) {
            $where[] = 'created_at <= %s';
            $params[] = $args['date_to'];
        }

        $where_clause = implode(' AND ', $where);

        $query = "SELECT {$groupby}, COUNT(*) as count 
                  FROM {$this->table_name} 
                  WHERE {$where_clause} 
                  GROUP BY {$groupby} 
                  ORDER BY count DESC";

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        return $wpdb->get_results($query, ARRAY_A);
    }

    /**
     * Get user activity timeline
     *
     * @param int $user_id User ID
     * @param int $limit Limit
     * @return array Events
     */
    public function get_user_timeline($user_id, $limit = 50)
    {
        return $this->get_events([
            'user_id' => $user_id,
            'limit' => $limit,
            'order' => 'DESC'
        ]);
    }

    /**
     * Get suspicious activity
     *
     * @param int $limit Limit
     * @return array Suspicious events
     */
    public function get_suspicious_activity($limit = 100)
    {
        global $wpdb;

        // Events that might indicate suspicious activity
        $suspicious_types = [
            'rate_limit_exceeded',
            'login_failed',
            'login_locked_out',
            'rest_nonce_invalid',
            'ajax_nonce_invalid',
            'rest_forbidden',
            'unauthorized_access_attempt'
        ];

        $types_placeholder = implode(',', array_fill(0, count($suspicious_types), '%s'));

        $query = $wpdb->prepare(
            "SELECT * FROM {$this->table_name} 
             WHERE event_type IN ({$types_placeholder})
             ORDER BY created_at DESC 
             LIMIT %d",
            array_merge($suspicious_types, [$limit])
        );

        $results = $wpdb->get_results($query, ARRAY_A);

        // Decode event data
        foreach ($results as &$result) {
            $result['event_data'] = json_decode($result['event_data'], true);
        }

        return $results;
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Sanitize event data
     *
     * @param array $data Event data
     * @return array Sanitized data
     */
    private function sanitize_event_data($data)
    {
        if (!is_array($data)) {
            return [];
        }

        // Remove sensitive data
        $sensitive_keys = ['password', 'token', 'secret', 'api_key', 'credit_card'];

        foreach ($sensitive_keys as $key) {
            if (isset($data[$key])) {
                $data[$key] = '[REDACTED]';
            }
        }

        // Limit data size (prevent huge logs)
        $json = wp_json_encode($data);
        if (strlen($json) > 50000) { // 50KB limit
            $data = ['_truncated' => true, '_original_size' => strlen($json)];
        }

        return $data;
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

        $ip = '';

        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        }

        $ip = filter_var($ip, FILTER_VALIDATE_IP);

        return $ip ? $ip : '0.0.0.0';
    }

    // ============================================================
    // MAINTENANCE
    // ============================================================

    /**
     * Cleanup old logs
     *
     * @param int $days Keep logs newer than X days
     */
    public function cleanup_old_logs($days = 90)
    {
        global $wpdb;

        $date = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        $deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM {$this->table_name} WHERE created_at < %s",
            $date
        ));

        if ($deleted !== false) {
            $this->log_system_event('audit_logs_cleaned', [
                'days' => $days,
                'deleted_count' => $deleted
            ]);
        }

        // Optimize table
        $wpdb->query("OPTIMIZE TABLE {$this->table_name}");
    }

    /**
     * Export logs to CSV
     *
     * @param array $args Query arguments
     * @return string|false CSV content or false on failure
     */
    public function export_to_csv($args = [])
    {
        $events = $this->get_events(array_merge($args, ['limit' => 10000]));

        if (empty($events)) {
            return false;
        }

        $csv = fopen('php://temp', 'r+');

        // Headers
        fputcsv($csv, [
            'Log ID',
            'Event Type',
            'Category',
            'User ID',
            'IP Address',
            'User Agent',
            'Event Data',
            'Date'
        ]);

        // Data
        foreach ($events as $event) {
            fputcsv($csv, [
                $event['log_id'],
                $event['event_type'],
                $event['category'],
                $event['user_id'],
                $event['ip_address'],
                $event['user_agent'],
                json_encode($event['event_data']),
                $event['created_at']
            ]);
        }

        rewind($csv);
        $output = stream_get_contents($csv);
        fclose($csv);

        return $output;
    }

    /**
     * Get database size
     *
     * @return array Size information
     */
    public function get_database_size()
    {
        global $wpdb;

        $query = $wpdb->prepare(
            "SELECT 
                COUNT(*) as total_rows,
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
             FROM information_schema.TABLES 
             WHERE table_schema = %s 
             AND table_name = %s",
            DB_NAME,
            $this->table_name
        );

        $result = $wpdb->get_row($query, ARRAY_A);

        return [
            'total_rows' => (int) ($result['total_rows'] ?? 0),
            'size_mb' => (float) ($result['size_mb'] ?? 0)
        ];
    }

    /**
     * Truncate audit log table (DANGER!)
     *
     * @return bool Success
     */
    public function truncate_table()
    {
        global $wpdb;

        // Only allow for administrators
        if (!current_user_can('manage_options')) {
            return false;
        }

        $result = $wpdb->query("TRUNCATE TABLE {$this->table_name}");

        if ($result !== false) {
            $this->log_system_event('audit_logs_truncated', [
                'user_id' => get_current_user_id()
            ]);
        }

        return $result !== false;
    }

    // ============================================================
    // REPORTING
    // ============================================================

    /**
     * Generate security report
     *
     * @param string $period Period (today, week, month)
     * @return array Report data
     */
    public function generate_security_report($period = 'week')
    {
        $date_from = $this->get_period_start_date($period);

        $args = [
            'category' => 'security',
            'date_from' => $date_from
        ];

        return [
            'period' => $period,
            'date_from' => $date_from,
            'total_events' => $this->get_event_count($args),
            'events_by_type' => $this->get_statistics('event_type', $args),
            'suspicious_activity' => $this->get_suspicious_activity(50),
            'top_ips' => $this->get_top_ips($args),
            'failed_login_attempts' => $this->get_event_count(array_merge($args, [
                'event_type' => 'login_failed'
            ])),
            'lockouts' => $this->get_event_count(array_merge($args, [
                'event_type' => 'login_locked_out'
            ])),
            'rate_limit_violations' => $this->get_event_count(array_merge($args, [
                'event_type' => 'rate_limit_exceeded'
            ]))
        ];
    }

    /**
     * Generate user activity report
     *
     * @param int $user_id User ID
     * @param string $period Period
     * @return array Report data
     */
    public function generate_user_report($user_id, $period = 'month')
    {
        $date_from = $this->get_period_start_date($period);

        $args = [
            'user_id' => $user_id,
            'date_from' => $date_from
        ];

        return [
            'user_id' => $user_id,
            'period' => $period,
            'date_from' => $date_from,
            'total_events' => $this->get_event_count($args),
            'events_by_type' => $this->get_statistics('event_type', $args),
            'events_by_category' => $this->get_statistics('category', $args),
            'recent_activity' => $this->get_user_timeline($user_id, 100)
        ];
    }

    /**
     * Get top IPs by activity
     *
     * @param array $args Query arguments
     * @param int $limit Limit
     * @return array Top IPs
     */
    private function get_top_ips($args = [], $limit = 10)
    {
        global $wpdb;

        $where = ['1=1'];
        $params = [];

        if (!empty($args['category'])) {
            $where[] = 'category = %s';
            $params[] = $args['category'];
        }

        if (!empty($args['date_from'])) {
            $where[] = 'created_at >= %s';
            $params[] = $args['date_from'];
        }

        $where_clause = implode(' AND ', $where);

        $query = "SELECT ip_address, COUNT(*) as count 
                  FROM {$this->table_name} 
                  WHERE {$where_clause} 
                  GROUP BY ip_address 
                  ORDER BY count DESC 
                  LIMIT %d";

        $params[] = $limit;

        $query = $wpdb->prepare($query, $params);

        return $wpdb->get_results($query, ARRAY_A);
    }

    /**
     * Get period start date
     *
     * @param string $period Period identifier
     * @return string Date string
     */
    private function get_period_start_date($period)
    {
        switch ($period) {
            case 'today':
                return date('Y-m-d 00:00:00');
            case 'week':
                return date('Y-m-d 00:00:00', strtotime('-7 days'));
            case 'month':
                return date('Y-m-d 00:00:00', strtotime('-30 days'));
            case 'year':
                return date('Y-m-d 00:00:00', strtotime('-365 days'));
            default:
                return date('Y-m-d 00:00:00', strtotime('-7 days'));
        }
    }

    // ============================================================
    // ALERTS
    // ============================================================

    /**
     * Check for alert conditions
     */
    public function check_alert_conditions()
    {
        $alerts = [];

        // Check for excessive failed logins
        $failed_logins = $this->get_event_count([
            'event_type' => 'login_failed',
            'date_from' => date('Y-m-d H:i:s', strtotime('-1 hour'))
        ]);

        if ($failed_logins > 20) {
            $alerts[] = [
                'type' => 'critical',
                'message' => "Excessive failed login attempts detected: {$failed_logins} in the last hour"
            ];
        }

        // Check for rate limit violations
        $rate_limits = $this->get_event_count([
            'event_type' => 'rate_limit_exceeded',
            'date_from' => date('Y-m-d H:i:s', strtotime('-1 hour'))
        ]);

        if ($rate_limits > 50) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "High number of rate limit violations: {$rate_limits} in the last hour"
            ];
        }

        // Check database size
        $size_info = $this->get_database_size();
        if ($size_info['size_mb'] > 500) {
            $alerts[] = [
                'type' => 'info',
                'message' => "Audit log database is large: {$size_info['size_mb']} MB. Consider cleanup."
            ];
        }

        return $alerts;
    }

    /**
     * Send alert email
     *
     * @param array $alerts Alerts to send
     * @return bool Success
     */
    public function send_alert_email($alerts)
    {
        if (empty($alerts)) {
            return false;
        }

        $admin_email = get_option('admin_email');

        $subject = sprintf(
            __('[%s] Security Alerts - %s', 'quiz-extended'),
            get_bloginfo('name'),
            date('Y-m-d H:i:s')
        );

        $message = __("Security alerts have been detected:\n\n", 'quiz-extended');

        foreach ($alerts as $alert) {
            $message .= sprintf(
                "[%s] %s\n",
                strtoupper($alert['type']),
                $alert['message']
            );
        }

        $message .= sprintf(
            __("\n\nView full audit log: %s\n\nThis is an automated alert.", 'quiz-extended'),
            admin_url('admin.php?page=qe-audit-log')
        );

        return wp_mail($admin_email, $subject, $message);
    }

    // ============================================================
    // ADMIN DASHBOARD WIDGET
    // ============================================================

    /**
     * Register admin dashboard widget
     */
    public function register_dashboard_widget()
    {
        wp_add_dashboard_widget(
            'qe_audit_log_widget',
            __('Quiz Extended - Recent Activity', 'quiz-extended'),
            [$this, 'render_dashboard_widget']
        );
    }

    /**
     * Render dashboard widget
     */
    public function render_dashboard_widget()
    {
        $recent_events = $this->get_events([
            'limit' => 10,
            'order' => 'DESC'
        ]);

        if (empty($recent_events)) {
            echo '<p>' . __('No recent activity.', 'quiz-extended') . '</p>';
            return;
        }

        echo '<ul class="qe-audit-widget-list">';

        foreach ($recent_events as $event) {
            $user = get_userdata($event['user_id']);
            $user_name = $user ? $user->display_name : __('System', 'quiz-extended');

            printf(
                '<li><strong>%s</strong> - %s (%s)</li>',
                esc_html($event['event_type']),
                esc_html($user_name),
                esc_html(human_time_diff(strtotime($event['created_at']))) . ' ' . __('ago', 'quiz-extended')
            );
        }

        echo '</ul>';

        printf(
            '<p><a href="%s">%s</a></p>',
            admin_url('admin.php?page=qe-audit-log'),
            __('View Full Audit Log →', 'quiz-extended')
        );
    }

    // ============================================================
    // SEARCH AND FILTERING
    // ============================================================

    /**
     * Search events by keyword
     *
     * @param string $keyword Search keyword
     * @param array $args Additional query arguments
     * @return array Events
     */
    public function search_events($keyword, $args = [])
    {
        global $wpdb;

        $defaults = [
            'category' => null,
            'date_from' => null,
            'date_to' => null,
            'limit' => 100,
            'offset' => 0
        ];

        $args = wp_parse_args($args, $defaults);

        // Build WHERE clause
        $where = ['1=1'];
        $params = [];

        // Search in event_type, event_data, and ip_address
        $where[] = '(event_type LIKE %s OR event_data LIKE %s OR ip_address LIKE %s)';
        $search_term = '%' . $wpdb->esc_like($keyword) . '%';
        $params[] = $search_term;
        $params[] = $search_term;
        $params[] = $search_term;

        if ($args['category']) {
            $where[] = 'category = %s';
            $params[] = $args['category'];
        }

        if ($args['date_from']) {
            $where[] = 'created_at >= %s';
            $params[] = $args['date_from'];
        }

        if ($args['date_to']) {
            $where[] = 'created_at <= %s';
            $params[] = $args['date_to'];
        }

        $where_clause = implode(' AND ', $where);

        $limit = absint($args['limit']);
        $offset = absint($args['offset']);

        $query = "SELECT * FROM {$this->table_name} 
                  WHERE {$where_clause} 
                  ORDER BY created_at DESC 
                  LIMIT {$limit} OFFSET {$offset}";

        $query = $wpdb->prepare($query, $params);

        $results = $wpdb->get_results($query, ARRAY_A);

        // Decode event data
        foreach ($results as &$result) {
            $result['event_data'] = json_decode($result['event_data'], true);
        }

        return $results;
    }

    /**
     * Get events by date range
     *
     * @param string $start_date Start date (Y-m-d)
     * @param string $end_date End date (Y-m-d)
     * @param array $args Additional arguments
     * @return array Events
     */
    public function get_events_by_date_range($start_date, $end_date, $args = [])
    {
        return $this->get_events(array_merge($args, [
            'date_from' => $start_date . ' 00:00:00',
            'date_to' => $end_date . ' 23:59:59'
        ]));
    }

    /**
     * Get events grouped by day
     *
     * @param string $start_date Start date
     * @param string $end_date End date
     * @return array Events grouped by day
     */
    public function get_events_grouped_by_day($start_date, $end_date)
    {
        global $wpdb;

        $query = $wpdb->prepare(
            "SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM {$this->table_name} 
             WHERE created_at BETWEEN %s AND %s 
             GROUP BY DATE(created_at) 
             ORDER BY date ASC",
            $start_date . ' 00:00:00',
            $end_date . ' 23:59:59'
        );

        return $wpdb->get_results($query, ARRAY_A);
    }

    // ============================================================
    // DATA RETENTION AND ARCHIVING
    // ============================================================

    /**
     * Archive old logs to file
     *
     * @param int $days Archive logs older than X days
     * @return string|false Archive file path or false on failure
     */
    public function archive_old_logs($days = 90)
    {
        $events = $this->get_events([
            'date_to' => date('Y-m-d H:i:s', strtotime("-{$days} days")),
            'limit' => 100000 // Large limit for archiving
        ]);

        if (empty($events)) {
            return false;
        }

        $upload_dir = wp_upload_dir();
        $archive_dir = $upload_dir['basedir'] . '/qe-audit-archives';

        if (!file_exists($archive_dir)) {
            wp_mkdir_p($archive_dir);
        }

        $archive_file = $archive_dir . '/audit-log-archive-' . date('Y-m-d-His') . '.json';

        $json = wp_json_encode($events, JSON_PRETTY_PRINT);

        if (file_put_contents($archive_file, $json) === false) {
            return false;
        }

        // Delete archived events from database
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$this->table_name} WHERE created_at < %s",
            date('Y-m-d H:i:s', strtotime("-{$days} days"))
        ));

        $this->log_system_event('audit_logs_archived', [
            'days' => $days,
            'count' => count($events),
            'file' => basename($archive_file)
        ]);

        return $archive_file;
    }

    /**
     * Get list of archive files
     *
     * @return array Archive files
     */
    public function get_archive_files()
    {
        $upload_dir = wp_upload_dir();
        $archive_dir = $upload_dir['basedir'] . '/qe-audit-archives';

        if (!file_exists($archive_dir)) {
            return [];
        }

        $files = glob($archive_dir . '/audit-log-archive-*.json');

        $archives = [];
        foreach ($files as $file) {
            $archives[] = [
                'filename' => basename($file),
                'path' => $file,
                'size' => filesize($file),
                'created' => filemtime($file)
            ];
        }

        // Sort by creation date, newest first
        usort($archives, function ($a, $b) {
            return $b['created'] - $a['created'];
        });

        return $archives;
    }

    // ============================================================
    // GDPR COMPLIANCE
    // ============================================================

    /**
     * Anonymize user data in logs
     *
     * @param int $user_id User ID
     * @return int Number of records anonymized
     */
    public function anonymize_user_data($user_id)
    {
        global $wpdb;

        $anonymized = $wpdb->update(
            $this->table_name,
            [
                'user_id' => 0,
                'ip_address' => '0.0.0.0',
                'user_agent' => '[ANONYMIZED]'
            ],
            ['user_id' => $user_id],
            ['%d', '%s', '%s'],
            ['%d']
        );

        if ($anonymized !== false) {
            $this->log_system_event('user_data_anonymized', [
                'affected_user_id' => $user_id,
                'records_count' => $anonymized
            ]);
        }

        return $anonymized;
    }

    /**
     * Export user data for GDPR
     *
     * @param int $user_id User ID
     * @return array User's audit log data
     */
    public function export_user_data($user_id)
    {
        return $this->get_events([
            'user_id' => $user_id,
            'limit' => 10000
        ]);
    }

    /**
     * Delete user data completely
     *
     * @param int $user_id User ID
     * @return int|false Number of records deleted
     */
    public function delete_user_data($user_id)
    {
        global $wpdb;

        $deleted = $wpdb->delete(
            $this->table_name,
            ['user_id' => $user_id],
            ['%d']
        );

        if ($deleted !== false) {
            $this->log_system_event('user_data_deleted', [
                'affected_user_id' => $user_id,
                'records_count' => $deleted
            ]);
        }

        return $deleted;
    }
}

// Initialize
QE_Audit_Log::instance();