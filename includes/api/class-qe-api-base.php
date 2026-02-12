<?php
/**
 * QE_API_Base Class
 *
 * Base class for all API endpoint handlers.
 * Provides common functionality, validation, security, and error handling.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

abstract class QE_API_Base
{
    /**
     * API namespace
     * 
     * @var string
     */
    protected $namespace = 'quiz-extended/v1';

    /**
     * Security instance
     * 
     * @var QE_Security
     */
    protected $security;

    /**
     * Auth instance
     * 
     * @var QE_Auth
     */
    protected $auth;

    /**
     * Rate limiter instance
     * 
     * @var QE_Rate_Limiter
     */
    protected $rate_limiter;

    /**
     * Audit log instance
     * 
     * @var QE_Audit_Log
     */
    protected $audit_log;

    /**
     * Constructor - Initialize dependencies
     */
    public function __construct()
    {
        // Initialize security components
        $this->security = QE_Security::instance();
        $this->auth = QE_Auth::instance();
        $this->rate_limiter = QE_Rate_Limiter::instance();
        $this->audit_log = QE_Audit_Log::instance();

        // Register routes
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Register routes - Must be implemented by child classes
     *
     * @return void
     */
    abstract public function register_routes();

    // ============================================================
    // ROUTE REGISTRATION HELPERS
    // ============================================================

    /**
     * Register a REST route with full security
     *
     * @param string $endpoint Route endpoint
     * @param string $methods HTTP methods
     * @param string $callback Callback method name
     * @param array $args Additional arguments
     * @return void
     */
    protected function register_secure_route($endpoint, $methods, $callback, $args = [])
    {
        $defaults = [
            'permission_callback' => [$this, 'check_permissions'],
            'args' => []
        ];

        $args = wp_parse_args($args, $defaults);

        // Add validation schema if provided
        if (isset($args['validation_schema'])) {
            $args['args'] = $this->build_validation_args($args['validation_schema']);
            unset($args['validation_schema']);
        }

        register_rest_route($this->namespace, $endpoint, [
            'methods' => $methods,
            'callback' => [$this, $callback],
            'permission_callback' => $args['permission_callback'],
            'args' => $args['args']
        ]);
    }

    /**
     * Build validation arguments from schema
     *
     * @param array $schema Validation schema
     * @return array Validation args
     */
    protected function build_validation_args($schema)
    {
        $args = [];

        foreach ($schema as $param => $config) {
            $args[$param] = [
                'required' => $config['required'] ?? false,
                'type' => $config['type'] ?? 'string',
                'description' => $config['description'] ?? '',
                'validate_callback' => function ($value, $request, $param) use ($config) {
                    return $this->validate_param($value, $config);
                },
                'sanitize_callback' => function ($value, $request, $param) use ($config) {
                    return $this->sanitize_param($value, $config);
                }
            ];

            // Add enum validation if provided
            if (isset($config['enum'])) {
                $args[$param]['enum'] = $config['enum'];
            }
        }

        return $args;
    }

    /**
     * Validate parameter based on config
     *
     * @param mixed $value Parameter value
     * @param array $config Validation config
     * @return bool|WP_Error True if valid, WP_Error otherwise
     */
    protected function validate_param($value, $config)
    {
        $type = $config['type'] ?? 'string';

        switch ($type) {
            case 'integer':
                if (!is_numeric($value)) {
                    return new WP_Error(
                        'invalid_param',
                        sprintf(__('Parameter must be a number.', 'quiz-extended'))
                    );
                }

                // Check min/max
                if (isset($config['minimum']) && $value < $config['minimum']) {
                    return new WP_Error(
                        'invalid_param',
                        sprintf(__('Parameter must be at least %d.', 'quiz-extended'), $config['minimum'])
                    );
                }

                if (isset($config['maximum']) && $value > $config['maximum']) {
                    return new WP_Error(
                        'invalid_param',
                        sprintf(__('Parameter must be at most %d.', 'quiz-extended'), $config['maximum'])
                    );
                }
                break;

            case 'string':
                if (!is_string($value) && !is_numeric($value)) {
                    return new WP_Error(
                        'invalid_param',
                        __('Parameter must be a string.', 'quiz-extended')
                    );
                }

                // Check max length
                if (isset($config['maxLength']) && mb_strlen($value, 'UTF-8') > $config['maxLength']) {
                    return new WP_Error(
                        'invalid_param',
                        sprintf(__('Parameter must be at most %d characters.', 'quiz-extended'), $config['maxLength'])
                    );
                }

                // Check enum
                if (isset($config['enum']) && !in_array($value, $config['enum'], true)) {
                    return new WP_Error(
                        'invalid_param',
                        sprintf(__('Parameter must be one of: %s', 'quiz-extended'), implode(', ', $config['enum']))
                    );
                }
                break;

            case 'array':
                if (!is_array($value)) {
                    return new WP_Error(
                        'invalid_param',
                        __('Parameter must be an array.', 'quiz-extended')
                    );
                }

                // Check items validation
                if (isset($config['items'])) {
                    foreach ($value as $item) {
                        $result = $this->validate_param($item, $config['items']);
                        if (is_wp_error($result)) {
                            return $result;
                        }
                    }
                }
                break;

            case 'boolean':
                if (!is_bool($value) && $value !== '0' && $value !== '1' && $value !== 0 && $value !== 1) {
                    return new WP_Error(
                        'invalid_param',
                        __('Parameter must be a boolean.', 'quiz-extended')
                    );
                }
                break;
        }

        return true;
    }

    /**
     * Sanitize parameter based on config
     *
     * @param mixed $value Parameter value
     * @param array $config Sanitization config
     * @return mixed Sanitized value
     */
    protected function sanitize_param($value, $config)
    {
        $type = $config['type'] ?? 'string';

        switch ($type) {
            case 'integer':
                return absint($value);

            case 'string':
                return sanitize_text_field($value);

            case 'array':
                if (!is_array($value)) {
                    return [];
                }

                // Sanitize each item
                if (isset($config['items'])) {
                    return array_map(function ($item) use ($config) {
                        return $this->sanitize_param($item, $config['items']);
                    }, $value);
                }

                return array_map('sanitize_text_field', $value);

            case 'boolean':
                return (bool) $value;

            case 'email':
                return sanitize_email($value);

            case 'url':
                return esc_url_raw($value);

            default:
                return $value;
        }
    }

    // ============================================================
    // PERMISSION CALLBACKS
    // ============================================================

    /**
     * Default permission check
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if allowed, WP_Error otherwise
     */
    public function check_permissions(WP_REST_Request $request)
    {
        // Must be logged in
        if (!is_user_logged_in()) {
            $this->audit_log->log_security_event('api_unauthorized_access', [
                'route' => $request->get_route(),
                'method' => $request->get_method(),
                'ip' => $this->security->get_client_ip()
            ]);

            return new WP_Error(
                'rest_forbidden',
                __('You must be logged in to access this resource.', 'quiz-extended'),
                ['status' => 401]
            );
        }

        // Verify nonce for state-changing operations
        if (in_array($request->get_method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            if (!$this->security->verify_rest_nonce($request)) {
                return new WP_Error(
                    'rest_nonce_invalid',
                    __('Invalid security token. Please refresh and try again.', 'quiz-extended'),
                    ['status' => 403]
                );
            }
        }

        return true;
    }

    /**
     * Check if user can access course content
     *
     * @param int $course_id Course ID
     * @return bool|WP_Error True if allowed, WP_Error otherwise
     */
    protected function check_course_access($course_id)
    {
        if (!$this->auth->can_view_course($course_id)) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have access to this course.', 'quiz-extended'),
                ['status' => 403]
            );
        }

        return true;
    }

    // ============================================================
    // RESPONSE HELPERS
    // ============================================================

    /**
     * Create success response
     *
     * @param mixed $data Response data
     * @param int $status HTTP status code
     * @return WP_REST_Response
     */
    protected function success_response($data, $status = 200)
    {
        return new WP_REST_Response([
            'success' => true,
            'data' => $data
        ], $status);
    }

    /**
     * Create error response
     *
     * @param string $code Error code
     * @param string $message Error message
     * @param int $status HTTP status code
     * @param array $data Additional error data
     * @return WP_Error
     */
    protected function error_response($code, $message, $status = 400, $data = [])
    {
        return new WP_Error(
            $code,
            $message,
            array_merge(['status' => $status], $data)
        );
    }

    /**
     * Create validation error response
     *
     * @param array $errors Validation errors
     * @return WP_Error
     */
    protected function validation_error($errors)
    {
        return $this->error_response(
            'validation_failed',
            __('Validation failed.', 'quiz-extended'),
            400,
            ['errors' => $errors]
        );
    }

    // ============================================================
    // DATABASE HELPERS
    // ============================================================

    /**
     * Get wpdb instance
     *
     * @return wpdb
     */
    protected function get_db()
    {
        global $wpdb;
        return $wpdb;
    }

    /**
     * Get table name with prefix
     *
     * @param string $table Table name without prefix
     * @return string Full table name
     */
    protected function get_table($table)
    {
        global $wpdb;
        return $wpdb->prefix . 'qe_' . $table;
    }

    /**
     * Execute database query safely
     *
     * @param string $query Query string
     * @param array $params Query parameters
     * @return mixed Query result
     */
    protected function db_query($query, $params = [])
    {
        $wpdb = $this->get_db();

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        return $wpdb->query($query);
    }

    /**
     * Get single row from database
     *
     * @param string $query Query string
     * @param array $params Query parameters
     * @return object|null Row object or null
     */
    protected function db_get_row($query, $params = [])
    {
        $wpdb = $this->get_db();

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        return $wpdb->get_row($query);
    }

    /**
     * Get multiple rows from database
     *
     * @param string $query Query string
     * @param array $params Query parameters
     * @return array Array of row objects
     */
    protected function db_get_results($query, $params = [])
    {
        $wpdb = $this->get_db();

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        return $wpdb->get_results($query);
    }

    /**
     * Get single variable from database
     *
     * @param string $query Query string
     * @param array $params Query parameters
     * @return mixed Single value
     */
    protected function db_get_var($query, $params = [])
    {
        $wpdb = $this->get_db();

        if (!empty($params)) {
            $query = $wpdb->prepare($query, $params);
        }

        return $wpdb->get_var($query);
    }

    /**
     * Insert row into database
     *
     * @param string $table Table name
     * @param array $data Data to insert
     * @param array $format Data format
     * @return int|false Insert ID or false on failure
     */
    protected function db_insert($table, $data, $format = [])
    {
        $wpdb = $this->get_db();
        $table_name = $this->get_table($table);

        $result = $wpdb->insert($table_name, $data, $format);

        if ($result === false) {
            $this->log_error('Database insert failed', [
                'table' => $table,
                'error' => $wpdb->last_error
            ]);
            return false;
        }

        return $wpdb->insert_id;
    }

    /**
     * Update row in database
     *
     * @param string $table Table name
     * @param array $data Data to update
     * @param array $where Where conditions
     * @param array $format Data format
     * @param array $where_format Where format
     * @return int|false Number of rows updated or false on failure
     */
    protected function db_update($table, $data, $where, $format = [], $where_format = [])
    {
        $wpdb = $this->get_db();
        $table_name = $this->get_table($table);

        $result = $wpdb->update($table_name, $data, $where, $format, $where_format);

        if ($result === false) {
            $this->log_error('Database update failed', [
                'table' => $table,
                'error' => $wpdb->last_error
            ]);
        }

        return $result;
    }

    /**
     * Delete row from database
     *
     * @param string $table Table name
     * @param array $where Where conditions
     * @param array $where_format Where format
     * @return int|false Number of rows deleted or false on failure
     */
    protected function db_delete($table, $where, $where_format = [])
    {
        $wpdb = $this->get_db();
        $table_name = $this->get_table($table);

        $result = $wpdb->delete($table_name, $where, $where_format);

        if ($result === false) {
            $this->log_error('Database delete failed', [
                'table' => $table,
                'error' => $wpdb->last_error
            ]);
        }

        return $result;
    }

    // ============================================================
    // LOGGING HELPERS
    // ============================================================

    /**
     * Log API call
     *
     * @param string $endpoint Endpoint called
     * @param array $data Additional data
     * @return void
     */
    protected function log_api_call($endpoint, $data = [])
    {
        $this->audit_log->log_api_call($endpoint, array_merge($data, [
            'user_id' => get_current_user_id(),
            'ip' => $this->security->get_client_ip()
        ]));
    }

    /**
     * Log error
     *
     * @param string $message Error message
     * @param array $context Error context
     * @return void
     */
    protected function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended API] ERROR: %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }

        $this->audit_log->log_event('api_error', array_merge([
            'message' => $message
        ], $context), 'api');
    }

    /**
     * Log info
     *
     * @param string $message Info message
     * @param array $context Info context
     * @return void
     */
    protected function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended API] INFO: %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    // ============================================================
    // VALIDATION HELPERS
    // ============================================================

    /**
     * Validate post exists and is correct type
     *
     * @param int $post_id Post ID
     * @param string $post_type Expected post type
     * @return WP_Post|WP_Error Post object or error
     */
    protected function validate_post($post_id, $post_type)
    {
        $post = get_post($post_id);

        if (!$post) {
            return $this->error_response(
                'post_not_found',
                sprintf(__('%s not found.', 'quiz-extended'), ucfirst($post_type)),
                404
            );
        }

        if ($post->post_type !== $post_type) {
            return $this->error_response(
                'invalid_post_type',
                sprintf(__('Invalid %s ID.', 'quiz-extended'), $post_type),
                400
            );
        }

        return $post;
    }

    /**
     * Validate user exists
     *
     * @param int $user_id User ID
     * @return WP_User|WP_Error User object or error
     */
    protected function validate_user($user_id)
    {
        $user = get_user_by('id', $user_id);

        if (!$user) {
            return $this->error_response(
                'user_not_found',
                __('User not found.', 'quiz-extended'),
                404
            );
        }

        return $user;
    }

    /**
     * Get current timestamp for MySQL
     *
     * @return string MySQL timestamp
     */
    protected function get_mysql_timestamp()
    {
        return current_time('mysql', 1);
    }
}