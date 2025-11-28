<?php
/**
 * QE_Debug_API Class
 *
 * Provides debugging endpoints for Quiz Extended
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

class QE_Debug_API extends QE_API_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        $this->namespace = 'quiz-extended/v1';
        $this->rest_base = 'debug';

        // Call parent constructor to register routes
        parent::__construct();
    }

    /**
     * Register API routes
     *
     * @return void
     */
    public function register_routes()
    {
        register_rest_route($this->namespace, '/' . $this->rest_base . '/capabilities', [
            'methods' => 'GET',
            'callback' => [$this, 'get_capabilities_debug'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        register_rest_route($this->namespace, '/' . $this->rest_base . '/user-info', [
            'methods' => 'GET',
            'callback' => [$this, 'get_user_info'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        register_rest_route($this->namespace, '/' . $this->rest_base . '/api-config', [
            'methods' => 'GET',
            'callback' => [$this, 'get_api_config'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        register_rest_route($this->namespace, '/' . $this->rest_base . '/fix-permissions', [
            'methods' => 'POST',
            'callback' => [$this, 'fix_permissions'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 🔧 TEMPORAL: Endpoint para sincronizar course_ids en quizzes
        register_rest_route($this->namespace, '/sync-quiz-course-ids', [
            'methods' => 'POST',
            'callback' => [$this, 'sync_quiz_course_ids'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 🔔 Debug endpoint para notificaciones
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notifications', [
            'methods' => 'GET',
            'callback' => [$this, 'debug_notifications'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 🔔 Test: Crear notificación de prueba
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notifications/test', [
            'methods' => 'POST',
            'callback' => [$this, 'test_create_notification'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 🔔 Debug logs de notificaciones
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notificationlogs', [
            'methods' => 'GET',
            'callback' => [$this, 'get_notification_logs'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 🔔 Limpiar logs de notificaciones
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notificationlogs/clear', [
            'methods' => 'POST',
            'callback' => [$this, 'clear_notification_logs'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 📊 Debug endpoint para sistema de estadísticas de preguntas
        register_rest_route($this->namespace, '/' . $this->rest_base . '/question-stats', [
            'methods' => 'GET',
            'callback' => [$this, 'get_question_stats_debug'],
            'permission_callback' => [$this, 'permissions_check']
        ]);
    }

    /**
     * Debug notifications system
     */
    public function debug_notifications($request)
    {
        global $wpdb;

        $notifications_table = $wpdb->prefix . 'qe_course_notifications';
        $reads_table = $wpdb->prefix . 'qe_notification_reads';

        // Check if tables exist
        $notifications_exists = $wpdb->get_var("SHOW TABLES LIKE '{$notifications_table}'") === $notifications_table;
        $reads_exists = $wpdb->get_var("SHOW TABLES LIKE '{$reads_table}'") === $reads_table;

        // Get notification count
        $notification_count = 0;
        if ($notifications_exists) {
            $notification_count = $wpdb->get_var("SELECT COUNT(*) FROM {$notifications_table}");
        }

        // Get recent notifications
        $recent_notifications = [];
        if ($notifications_exists) {
            $recent_notifications = $wpdb->get_results(
                "SELECT * FROM {$notifications_table} ORDER BY created_at DESC LIMIT 10",
                ARRAY_A
            );
        }

        // Get DB version info
        $db_version = get_option('qe_db_version', 'not set');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tables' => [
                    'notifications' => [
                        'name' => $notifications_table,
                        'exists' => $notifications_exists
                    ],
                    'reads' => [
                        'name' => $reads_table,
                        'exists' => $reads_exists
                    ]
                ],
                'db_version' => $db_version,
                'expected_version' => '2.0.3',
                'notification_count' => (int) $notification_count,
                'recent_notifications' => $recent_notifications,
                'hooks_class_loaded' => class_exists('QE_Notification_Hooks'),
                'api_class_loaded' => class_exists('QE_Notifications_API')
            ]
        ], 200);
    }

    /**
     * Test create notification
     */
    public function test_create_notification($request)
    {
        global $wpdb;

        $course_id = $request->get_param('course_id') ?: 1;

        // Load API class
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

        // Try to create notification
        $result = QE_Notifications_API::create_notification_record(
            $course_id,
            'new_quiz',
            'Test Notification',
            'This is a test notification created via debug endpoint',
            null,
            null
        );

        return new WP_REST_Response([
            'success' => $result !== false,
            'data' => [
                'notification_id' => $result,
                'course_id' => $course_id,
                'wpdb_last_error' => $wpdb->last_error,
                'wpdb_last_query' => $wpdb->last_query
            ]
        ], $result !== false ? 200 : 500);
    }

    /**
     * Get notification debug logs
     */
    public function get_notification_logs($request)
    {
        // Cargar la clase de hooks si existe
        if (!class_exists('QE_Notification_Hooks')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-notification-hooks.php';
        }

        $logs = QE_Notification_Hooks::get_debug_logs();

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'logs' => $logs,
                'count' => count($logs),
                'timestamp' => current_time('mysql')
            ]
        ], 200);
    }

    /**
     * Clear notification debug logs
     */
    public function clear_notification_logs($request)
    {
        delete_option('qe_notification_debug_log');

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Notification logs cleared',
            'timestamp' => current_time('mysql')
        ], 200);
    }

    /**
     * Get capabilities debug info
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_capabilities_debug($request)
    {
        try {
            $debug_info = QE_Capabilities::debug_user_capabilities();
            $capabilities_status = QE_Capabilities::get_capabilities_status();

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'user_debug' => $debug_info,
                    'capabilities_status' => $capabilities_status,
                    'timestamp' => current_time('mysql')
                ]
            ], 200);

        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user info
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_user_info($request)
    {
        try {
            $current_user = wp_get_current_user();

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'id' => $current_user->ID,
                    'login' => $current_user->user_login,
                    'email' => $current_user->user_email,
                    'roles' => $current_user->roles,
                    'capabilities' => array_keys($current_user->allcaps, true),
                    'is_admin' => current_user_can('manage_options'),
                    'can_edit_posts' => current_user_can('edit_posts'),
                    'timestamp' => current_time('mysql')
                ]
            ], 200);

        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get API configuration
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_api_config($request)
    {
        try {
            $api_url_base = rtrim(home_url('/wp-json'), '/');

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'api_url' => $api_url_base,
                    'endpoints' => [
                        'courses' => $api_url_base . '/wp/v2/qe_course',
                        'lessons' => $api_url_base . '/wp/v2/qe_lesson',
                        'quizzes' => $api_url_base . '/wp/v2/qe_quiz',
                        'questions' => $api_url_base . '/wp/v2/qe_question',
                        'users' => $api_url_base . '/wp/v2/users',
                        'debug' => $api_url_base . '/quiz-extended/v1/debug',
                    ],
                    'nonce_test' => wp_verify_nonce($request->get_header('X-WP-Nonce'), 'wp_rest'),
                    'rest_api_enabled' => get_option('wp_api_enabled', true),
                    'timestamp' => current_time('mysql')
                ]
            ], 200);

        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fix permissions for Quiz Extended CPTs
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function fix_permissions($request)
    {
        try {
            // Call the capabilities class to add permissions
            QE_Capabilities::add_capabilities();

            // Verify the fix worked
            $capabilities_status = QE_Capabilities::get_capabilities_status();

            return new WP_REST_Response([
                'success' => true,
                'message' => 'Permissions have been added to administrator role',
                'data' => [
                    'capabilities_status' => $capabilities_status,
                    'timestamp' => current_time('mysql')
                ]
            ], 200);

        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🔧 TEMPORAL: Sync course_ids for all quizzes
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function sync_quiz_course_ids($request)
    {
        try {
            // Verificar que la clase existe
            if (!class_exists('QE_Quiz_Course_Sync')) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'QE_Quiz_Course_Sync class not found'
                ], 500);
            }

            // Ejecutar sincronización
            $stats = QE_Quiz_Course_Sync::sync_all_quizzes();

            return new WP_REST_Response([
                'success' => true,
                'data' => $stats,
                'message' => 'Quiz course IDs synchronized successfully',
                'timestamp' => current_time('mysql')
            ], 200);

        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Debug Quiz Relationships
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function debug_quiz_relationships($request)
    {
        $quiz_id = $request->get_param('quiz_id');

        $debug_data = [
            'quiz_id' => $quiz_id,
            'meta' => [
                '_lesson_id' => get_post_meta($quiz_id, '_lesson_id', true),
                '_course_ids' => get_post_meta($quiz_id, '_course_ids', true),
            ],
            'found_in_lessons' => []
        ];

        // Search for lessons containing this quiz
        $all_lessons = get_posts(['post_type' => 'qe_lesson', 'posts_per_page' => -1]);

        foreach ($all_lessons as $lesson) {
            $steps = get_post_meta($lesson->ID, '_lesson_steps', true);

            // Handle different storage formats
            if (is_string($steps)) {
                $decoded = json_decode($steps, true);
                if (!$decoded)
                    $decoded = maybe_unserialize($steps);
                $steps = $decoded;
            }

            if (is_array($steps)) {
                foreach ($steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz') {
                        $step_quiz_id = isset($step['data']['quiz_id']) ? $step['data']['quiz_id'] : null;

                        // Loose comparison for string/int mismatch
                        if ($step_quiz_id == $quiz_id) {
                            $debug_data['found_in_lessons'][] = [
                                'lesson_id' => $lesson->ID,
                                'lesson_title' => $lesson->post_title,
                                'course_id_of_lesson' => get_post_meta($lesson->ID, '_course_id', true)
                            ];
                        }
                    }
                }
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => $debug_data
        ], 200);
    }

    /**
     * Permission check for debug endpoints
     *
     * @param WP_REST_Request $request
     * @return bool
     */
    public function permissions_check($request)
    {
        return current_user_can('manage_options');
    }

    /**
     * Debug endpoint for question stats system
     * 
     * GET /wp-json/quiz-extended/v1/debug/question-stats
     * GET /wp-json/quiz-extended/v1/debug/question-stats?user_id=123
     * GET /wp-json/quiz-extended/v1/debug/question-stats?test_update=1&user_id=3&quiz_id=100
     */
    public function get_question_stats_debug($request)
    {
        global $wpdb;

        $stats_table = $wpdb->prefix . 'qe_user_question_stats';
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';

        $debug_data = [
            'timestamp' => current_time('mysql'),
            'tables' => [],
            'stats' => [],
            'recent_attempts' => [],
            'test_result' => null
        ];

        // 1. Check tables exist
        $debug_data['tables']['stats_table'] = [
            'name' => $stats_table,
            'exists' => (bool) $wpdb->get_var("SHOW TABLES LIKE '$stats_table'")
        ];
        $debug_data['tables']['attempts_table'] = [
            'name' => $attempts_table,
            'exists' => (bool) $wpdb->get_var("SHOW TABLES LIKE '$attempts_table'")
        ];
        $debug_data['tables']['answers_table'] = [
            'name' => $answers_table,
            'exists' => (bool) $wpdb->get_var("SHOW TABLES LIKE '$answers_table'")
        ];

        // 2. Get stats table counts
        if ($debug_data['tables']['stats_table']['exists']) {
            $debug_data['stats']['total_records'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM $stats_table");
            $debug_data['stats']['unique_users'] = (int) $wpdb->get_var("SELECT COUNT(DISTINCT user_id) FROM $stats_table");
            $debug_data['stats']['unique_questions'] = (int) $wpdb->get_var("SELECT COUNT(DISTINCT question_id) FROM $stats_table");

            // By status
            $by_status = $wpdb->get_results("
                SELECT last_answer_status, COUNT(*) as count 
                FROM $stats_table 
                GROUP BY last_answer_status
            ");
            $debug_data['stats']['by_status'] = [];
            foreach ($by_status as $row) {
                $debug_data['stats']['by_status'][$row->last_answer_status] = (int) $row->count;
            }

            // Latest 5 updates
            $debug_data['stats']['latest_updates'] = $wpdb->get_results("
                SELECT user_id, question_id, course_id, last_answer_status, is_correct, 
                       times_answered, updated_at
                FROM $stats_table 
                ORDER BY updated_at DESC 
                LIMIT 5
            ");
        }

        // 3. Get recent completed attempts
        $debug_data['recent_attempts'] = $wpdb->get_results("
            SELECT attempt_id, user_id, quiz_id, course_id, score, status, end_time
            FROM $attempts_table 
            WHERE status = 'completed'
            ORDER BY end_time DESC 
            LIMIT 5
        ");

        // 4. Check specific user if requested
        $user_id = $request->get_param('user_id');
        if ($user_id) {
            $user_id = (int) $user_id;
            $debug_data['user_check'] = [
                'user_id' => $user_id,
                'stats_records' => (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM $stats_table WHERE user_id = %d",
                    $user_id
                )),
                'completed_attempts' => (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM $attempts_table WHERE user_id = %d AND status = 'completed'",
                    $user_id
                )),
                'latest_stats' => $wpdb->get_results($wpdb->prepare("
                    SELECT question_id, last_answer_status, is_correct, times_answered, updated_at
                    FROM $stats_table 
                    WHERE user_id = %d
                    ORDER BY updated_at DESC
                    LIMIT 5
                ", $user_id))
            ];
        }

        // 5. Test manual update if requested
        $test_update = $request->get_param('test_update');
        if ($test_update && $user_id) {
            $quiz_id = $request->get_param('quiz_id');
            if ($quiz_id) {
                // Simulate calling the updater
                $debug_data['test_result'] = [
                    'action' => 'manual_trigger',
                    'user_id' => $user_id,
                    'quiz_id' => $quiz_id,
                    'before_count' => (int) $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $stats_table WHERE user_id = %d",
                        $user_id
                    ))
                ];

                // Get latest attempt for this user/quiz
                $attempt = $wpdb->get_row($wpdb->prepare("
                    SELECT attempt_id, course_id, lesson_id
                    FROM $attempts_table
                    WHERE user_id = %d AND quiz_id = %d AND status = 'completed'
                    ORDER BY end_time DESC
                    LIMIT 1
                ", $user_id, $quiz_id));

                if ($attempt) {
                    $debug_data['test_result']['attempt_found'] = $attempt;

                    // Manually call the updater
                    if (class_exists('QE_Question_Stats_Updater')) {
                        QE_Question_Stats_Updater::update_user_question_stats($user_id, $quiz_id, [
                            'attempt_id' => $attempt->attempt_id
                        ]);
                        $debug_data['test_result']['updater_called'] = true;
                    } else {
                        $debug_data['test_result']['error'] = 'QE_Question_Stats_Updater class not found';
                    }

                    $debug_data['test_result']['after_count'] = (int) $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(*) FROM $stats_table WHERE user_id = %d",
                        $user_id
                    ));
                } else {
                    $debug_data['test_result']['error'] = 'No completed attempt found for this user/quiz';
                }
            } else {
                $debug_data['test_result']['error'] = 'quiz_id required for test_update';
            }
        }

        // 6. Check if updater class is loaded
        $debug_data['updater_status'] = [
            'class_exists' => class_exists('QE_Question_Stats_Updater'),
            'hook_registered' => has_action('qe_quiz_attempt_submitted')
        ];

        return new WP_REST_Response([
            'success' => true,
            'data' => $debug_data
        ], 200);
    }
}