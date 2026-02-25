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

        // 🔍 DB Consult endpoint
        register_rest_route($this->namespace, '/' . $this->rest_base . '/db-consult', [
            'methods' => 'GET',
            'callback' => [$this, 'db_consult'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'type' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['question', 'lesson', 'quiz', 'course']
                ],
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'minimum' => 1
                ]
            ]
        ]);

        // 📋 List all providers with question counts
        register_rest_route($this->namespace, '/' . $this->rest_base . '/providers', [
            'methods' => 'GET',
            'callback' => [$this, 'list_providers'],
            'permission_callback' => [$this, 'permissions_check'],
        ]);

        // 📊 Provider analysis — all questions for a provider with lesson/quiz/course breakdown
        register_rest_route($this->namespace, '/' . $this->rest_base . '/provider-analysis', [
            'methods' => 'GET',
            'callback' => [$this, 'provider_analysis'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'slug' => ['required' => true, 'type' => 'string']
            ]
        ]);

        // 📚 Provider lessons — lessons that have at least one question for a given provider
        register_rest_route($this->namespace, '/' . $this->rest_base . '/provider-lessons', [
            'methods' => 'GET',
            'callback' => [$this, 'provider_lessons'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'provider' => ['required' => true],
                'category' => ['required' => false]
            ]
        ]);

        // 🔗 Question chain analysis endpoint
        register_rest_route($this->namespace, '/' . $this->rest_base . '/question-chain', [
            'methods' => 'GET',
            'callback' => [$this, 'question_chain'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'minimum' => 1
                ]
            ]
        ]);

        // 🧹 Endpoint para limpieza de opciones autoload
        register_rest_route($this->namespace, '/' . $this->rest_base . '/cleanup-autoload', [
            'methods' => 'POST',
            'callback' => [$this, 'cleanup_autoload_options'],
            'permission_callback' => [$this, 'permissions_check']
        ]);

        // 📊 Endpoint para ver estado de opciones autoload
        register_rest_route($this->namespace, '/' . $this->rest_base . '/autoload-status', [
            'methods' => 'GET',
            'callback' => [$this, 'get_autoload_status'],
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
     * DB Consult - return all post + meta (deserialized) + taxonomy + reverse-lookup connection data
     *
     * GET /wp-json/quiz-extended/v1/debug/db-consult?type=question&id=123
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function db_consult($request)
    {
        global $wpdb;

        $type_map = [
            'question' => 'qe_question',
            'lesson'   => 'qe_lesson',
            'quiz'     => 'qe_quiz',
            'course'   => 'qe_course',
        ];

        $type      = $request->get_param('type');
        $id        = (int) $request->get_param('id');
        $post_type = $type_map[$type];

        // Get post row
        $post = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->posts} WHERE ID = %d AND post_type = %s",
            $id, $post_type
        ), ARRAY_A);

        if (!$post) {
            return new WP_REST_Response([
                'success' => false,
                'message' => "No {$type} found with ID {$id} (post_type: {$post_type})"
            ], 404);
        }

        // Get all postmeta, deserializing each value so arrays/objects are readable
        $meta_rows = $wpdb->get_results($wpdb->prepare(
            "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_key",
            $id
        ), ARRAY_A);

        $meta = [];
        foreach ($meta_rows as $row) {
            $raw = $row['meta_value'];
            // Try PHP unserialize first, then JSON decode, otherwise keep raw
            $unserialized = @maybe_unserialize($raw);
            if ($unserialized !== $raw) {
                $meta[$row['meta_key']] = $unserialized;
            } else {
                $decoded = json_decode($raw, true);
                $meta[$row['meta_key']] = ($decoded !== null) ? $decoded : $raw;
            }
        }

        // Get taxonomy terms (names + slugs, grouped by taxonomy)
        $tax_names = get_object_taxonomies($post_type);
        $terms     = [];
        if (!empty($tax_names)) {
            $all_terms = wp_get_object_terms($id, $tax_names);
            foreach ($all_terms as $term) {
                if (!isset($terms[$term->taxonomy])) {
                    $terms[$term->taxonomy] = [];
                }
                $terms[$term->taxonomy][] = [
                    'id'   => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                ];
            }
        }

        // Build entity-specific reverse-lookup connections
        $connections = $this->get_db_consult_connections($type, $id, $meta, $wpdb);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'post'        => $post,
                'meta'        => $meta,
                'taxonomies'  => $terms,
                'connections' => $connections,
            ]
        ], 200);
    }

    /**
     * Build reverse-lookup connection data for each entity type.
     * Helps understand which entities reference the queried one.
     *
     * @param string $type    question|lesson|quiz|course
     * @param int    $id      Entity ID
     * @param array  $meta    Already-deserialized meta array
     * @param object $wpdb    Global wpdb
     * @return array
     */
    private function get_db_consult_connections($type, $id, $meta, $wpdb)
    {
        $connections = [];

        if ($type === 'question') {
            // Which quizzes contain this question? (stored in _quiz_question_ids)
            $quizzes_with_question = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID, p.post_title, p.post_status, pm.meta_value AS raw_question_ids
                 FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key = '_quiz_question_ids'
                 AND p.post_type = 'qe_quiz'
                 AND (
                     pm.meta_value LIKE %s
                     OR pm.meta_value LIKE %s
                     OR pm.meta_value = %s
                 )",
                '%i:' . $id . ';%',          // inside serialized array
                '%"' . $id . '"%',           // inside JSON array
                (string) $id                 // single value
            ), ARRAY_A);

            $connections['quizzes_referencing_this_question'] = array_map(function ($row) {
                $parsed = @maybe_unserialize($row['raw_question_ids']);
                if ($parsed === $row['raw_question_ids']) {
                    $parsed = json_decode($row['raw_question_ids'], true) ?? $row['raw_question_ids'];
                }
                return [
                    'quiz_id'     => (int) $row['ID'],
                    'quiz_title'  => $row['post_title'],
                    'post_status' => $row['post_status'],
                    'question_ids_in_quiz' => $parsed,
                ];
            }, $quizzes_with_question);

            // Resolved lesson/course names from meta IDs
            $connections['meta_resolved'] = [];
            foreach (['_course_ids', '_lesson_ids', '_course_id', '_question_lesson'] as $key) {
                if (!empty($meta[$key])) {
                    $ids = is_array($meta[$key]) ? $meta[$key] : [$meta[$key]];
                    $resolved = [];
                    foreach ($ids as $rel_id) {
                        $rel_id = (int) $rel_id;
                        if ($rel_id <= 0) continue;
                        $title = $wpdb->get_var($wpdb->prepare(
                            "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $rel_id
                        ));
                        $resolved[] = ['id' => $rel_id, 'title' => $title ?: '(not found)'];
                    }
                    $connections['meta_resolved'][$key] = $resolved;
                }
            }
        }

        if ($type === 'quiz') {
            // Which lessons reference this quiz? (via _quiz_ids or _lesson_steps)
            $lessons_via_quiz_ids = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID, p.post_title, p.post_status
                 FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key = '_quiz_ids'
                 AND p.post_type = 'qe_lesson'
                 AND (
                     pm.meta_value LIKE %s
                     OR pm.meta_value LIKE %s
                 )",
                '%i:' . $id . ';%',
                '%"' . $id . '"%'
            ), ARRAY_A);

            $lessons_via_steps = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID, p.post_title, p.post_status, pm.meta_value AS raw_steps
                 FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key = '_lesson_steps'
                 AND p.post_type = 'qe_lesson'
                 AND pm.meta_value LIKE %s",
                '%' . $id . '%'
            ), ARRAY_A);

            $connections['lessons_referencing_this_quiz'] = [
                'via__quiz_ids'     => $lessons_via_quiz_ids,
                'via__lesson_steps' => array_map(function ($row) {
                    $parsed = @maybe_unserialize($row['raw_steps']);
                    if ($parsed === $row['raw_steps']) {
                        $parsed = json_decode($row['raw_steps'], true) ?? $row['raw_steps'];
                    }
                    return [
                        'lesson_id'    => (int) $row['ID'],
                        'lesson_title' => $row['post_title'],
                        'post_status'  => $row['post_status'],
                        'steps'        => $parsed,
                    ];
                }, $lessons_via_steps),
            ];

            // Resolve course name
            if (!empty($meta['_course_id'])) {
                $course_id = (int) $meta['_course_id'];
                $course_title = $wpdb->get_var($wpdb->prepare(
                    "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $course_id
                ));
                $connections['course'] = ['id' => $course_id, 'title' => $course_title ?: '(not found)'];
            }

            // Resolve question titles
            if (!empty($meta['_quiz_question_ids']) && is_array($meta['_quiz_question_ids'])) {
                $connections['questions_in_this_quiz'] = [];
                foreach ($meta['_quiz_question_ids'] as $q_id) {
                    $q_id = (int) $q_id;
                    if ($q_id <= 0) continue;
                    $q_title = $wpdb->get_var($wpdb->prepare(
                        "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $q_id
                    ));
                    $connections['questions_in_this_quiz'][] = ['id' => $q_id, 'title' => $q_title ?: '(not found)'];
                }
            }
        }

        if ($type === 'lesson') {
            // Resolve parent course
            if (!empty($meta['_course_id'])) {
                $course_id = (int) $meta['_course_id'];
                $course_title = $wpdb->get_var($wpdb->prepare(
                    "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $course_id
                ));
                $connections['course'] = ['id' => $course_id, 'title' => $course_title ?: '(not found)'];
            }

            // Resolve quiz titles from _quiz_ids
            if (!empty($meta['_quiz_ids']) && is_array($meta['_quiz_ids'])) {
                $connections['quizzes_in_this_lesson'] = [];
                foreach ($meta['_quiz_ids'] as $q_id) {
                    $q_id = (int) $q_id;
                    if ($q_id <= 0) continue;
                    $q_title = $wpdb->get_var($wpdb->prepare(
                        "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $q_id
                    ));
                    $connections['quizzes_in_this_lesson'][] = ['id' => $q_id, 'title' => $q_title ?: '(not found)'];
                }
            }

            // Parse _lesson_steps for quick human-readable summary
            if (!empty($meta['_lesson_steps'])) {
                $steps = $meta['_lesson_steps']; // already deserialized above
                if (is_array($steps)) {
                    $connections['lesson_steps_summary'] = array_map(function ($step) use ($wpdb) {
                        $summary = ['type' => $step['type'] ?? 'unknown'];
                        $ref_id = null;
                        if (isset($step['data']['quiz_id'])) {
                            $ref_id = (int) $step['data']['quiz_id'];
                            $summary['quiz_id'] = $ref_id;
                        }
                        if ($ref_id) {
                            $summary['title'] = $wpdb->get_var($wpdb->prepare(
                                "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $ref_id
                            )) ?: '(not found)';
                        }
                        return $summary;
                    }, $steps);
                }
            }
        }

        if ($type === 'course') {
            // All lessons in this course
            $lessons = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID, p.post_title, p.post_status, pm2.meta_value AS lesson_order
                 FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 LEFT JOIN {$wpdb->postmeta} pm2 ON pm2.post_id = p.ID AND pm2.meta_key = '_lesson_order'
                 WHERE pm.meta_key = '_course_id' AND pm.meta_value = %s
                 AND p.post_type = 'qe_lesson'
                 ORDER BY CAST(pm2.meta_value AS UNSIGNED) ASC, p.ID ASC",
                (string) $id
            ), ARRAY_A);
            $connections['lessons'] = $lessons;

            // All quizzes in this course
            $quizzes = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID, p.post_title, p.post_status
                 FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key = '_course_id' AND pm.meta_value = %s
                 AND p.post_type = 'qe_quiz'
                 ORDER BY p.ID ASC",
                (string) $id
            ), ARRAY_A);
            $connections['quizzes'] = $quizzes;
        }

        return $connections;
    }

    /**
     * List all providers (qe_provider taxonomy) with their question counts.
     *
     * GET /wp-json/quiz-extended/v1/debug/providers
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function list_providers($request)
    {
        $terms = get_terms([
            'taxonomy'   => 'qe_provider',
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ]);

        if (is_wp_error($terms)) {
            return new WP_REST_Response(['success' => false, 'message' => $terms->get_error_message()], 500);
        }

        $providers = array_map(function ($term) {
            return [
                'id'             => $term->term_id,
                'name'           => $term->name,
                'slug'           => $term->slug,
                'question_count' => (int) $term->count,
            ];
        }, $terms);

        return new WP_REST_Response(['success' => true, 'data' => $providers], 200);
    }

    /**
     * Provider lessons — return lessons that have at least one question for a given provider.
     * Used by the QuestionSelector Temas dropdown to show only relevant lessons.
     *
     * GET /wp-json/quiz-extended/v1/debug/provider-lessons?provider={term_id_or_slug}
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function provider_lessons($request)
    {
        global $wpdb;

        $provider_param = $request->get_param('provider');
        $category_param = $request->get_param('category');

        if (empty($provider_param) && empty($category_param)) {
            return new WP_REST_Response(['success' => false, 'message' => 'provider or category parameter required'], 400);
        }

        // Start with no restriction (null = not yet filtered)
        $question_ids = null;

        // Filter by provider if provided
        if (!empty($provider_param)) {
            if (is_numeric($provider_param)) {
                $term = get_term((int) $provider_param, 'qe_provider');
            } else {
                $term = get_term_by('slug', sanitize_title($provider_param), 'qe_provider');
            }

            if (!$term || is_wp_error($term)) {
                return new WP_REST_Response(['success' => false, 'message' => "Provider '{$provider_param}' not found"], 404);
            }

            $question_ids = $wpdb->get_col($wpdb->prepare(
                "SELECT tr.object_id
                 FROM {$wpdb->term_relationships} tr
                 JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                 JOIN {$wpdb->posts} p ON tr.object_id = p.ID
                 WHERE tt.term_id = %d
                   AND tt.taxonomy = 'qe_provider'
                   AND p.post_type = 'qe_question'
                   AND p.post_status != 'trash'",
                $term->term_id
            ));
        }

        // Filter by category if provided — intersect with provider results when both are set
        if (!empty($category_param) && is_numeric($category_param)) {
            $category_question_ids = $wpdb->get_col($wpdb->prepare(
                "SELECT tr.object_id
                 FROM {$wpdb->term_relationships} tr
                 JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                 JOIN {$wpdb->posts} p ON tr.object_id = p.ID
                 WHERE tt.term_id = %d
                   AND tt.taxonomy = 'qe_category'
                   AND p.post_type = 'qe_question'
                   AND p.post_status != 'trash'",
                (int) $category_param
            ));

            $question_ids = $question_ids === null
                ? $category_question_ids
                : array_values(array_intersect($question_ids, $category_question_ids));
        }

        $question_ids = array_values(array_filter((array) $question_ids));

        if (empty($question_ids)) {
            return new WP_REST_Response([
                'success' => true,
                'data' => ['lessons' => [], 'question_count' => 0]
            ], 200);
        }

        $ids_str = implode(',', array_map('intval', $question_ids));

        // Collect all lesson IDs from _question_lesson (legacy) and _lesson_ids (new)
        $lesson_ids_legacy = $wpdb->get_col(
            "SELECT DISTINCT meta_value FROM {$wpdb->postmeta}
             WHERE post_id IN ({$ids_str})
               AND meta_key = '_question_lesson'
               AND meta_value != ''
               AND meta_value != '0'"
        );

        $lesson_ids_new_raw = $wpdb->get_col(
            "SELECT DISTINCT meta_value FROM {$wpdb->postmeta}
             WHERE post_id IN ({$ids_str})
               AND meta_key = '_lesson_ids'
               AND meta_value != ''"
        );

        $all_lesson_ids = array_map('intval', $lesson_ids_legacy);

        foreach ($lesson_ids_new_raw as $raw) {
            $decoded = @maybe_unserialize($raw);
            if (!is_array($decoded)) {
                $decoded = json_decode($raw, true);
            }
            if (is_array($decoded)) {
                foreach ($decoded as $lid) {
                    $all_lesson_ids[] = (int) $lid;
                }
            } elseif (is_numeric($raw) && (int) $raw > 0) {
                $all_lesson_ids[] = (int) $raw;
            }
        }

        $all_lesson_ids = array_values(array_unique(array_filter($all_lesson_ids)));

        // Secondary path: question → quiz → lesson.
        // Catches questions embedded in lesson quizzes whose _question_lesson
        // denormalized cache was never written or is out of date.
        $quiz_meta_rows = $wpdb->get_results(
            "SELECT post_id, meta_value
             FROM {$wpdb->postmeta}
             WHERE meta_key = '_quiz_question_ids'
               AND meta_value != ''",
            ARRAY_A
        );

        $quiz_ids_for_questions = [];
        foreach ($quiz_meta_rows as $row) {
            $parsed = @maybe_unserialize($row['meta_value']);
            if ($parsed === $row['meta_value']) {
                $parsed = json_decode($row['meta_value'], true);
            }
            if (!is_array($parsed)) continue;
            $qids = array_map('intval', $parsed);
            if (!empty(array_intersect($question_ids, $qids))) {
                $quiz_ids_for_questions[] = (int) $row['post_id'];
            }
        }

        if (!empty($quiz_ids_for_questions)) {
            $lesson_meta_rows = $wpdb->get_results(
                "SELECT pm.post_id, pm.meta_key, pm.meta_value
                 FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key IN ('_quiz_ids', '_lesson_steps')
                   AND p.post_type = 'qe_lesson'
                   AND p.post_status IN ('publish', 'draft', 'private')",
                ARRAY_A
            );

            foreach ($lesson_meta_rows as $lrow) {
                $parsed = @maybe_unserialize($lrow['meta_value']);
                if ($parsed === $lrow['meta_value']) {
                    $parsed = json_decode($lrow['meta_value'], true);
                }
                if (!is_array($parsed)) continue;

                $quiz_ids_in_lesson = [];

                if ($lrow['meta_key'] === '_quiz_ids') {
                    $quiz_ids_in_lesson = array_map('intval', $parsed);
                } elseif ($lrow['meta_key'] === '_lesson_steps') {
                    foreach ($parsed as $step) {
                        if (
                            is_array($step) &&
                            ($step['type'] ?? '') === 'quiz' &&
                            !empty($step['data']['quiz_id'])
                        ) {
                            $quiz_ids_in_lesson[] = (int) $step['data']['quiz_id'];
                        }
                    }
                }

                if (!empty(array_intersect($quiz_ids_in_lesson, $quiz_ids_for_questions))) {
                    $all_lesson_ids[] = (int) $lrow['post_id'];
                }
            }

            $all_lesson_ids = array_values(array_unique(array_filter($all_lesson_ids)));
        }

        if (empty($all_lesson_ids)) {
            return new WP_REST_Response([
                'success' => true,
                'data' => ['lessons' => [], 'question_count' => count($question_ids)]
            ], 200);
        }

        $lids_str = implode(',', $all_lesson_ids);
        $lessons_raw = $wpdb->get_results(
            "SELECT ID, post_title FROM {$wpdb->posts}
             WHERE ID IN ({$lids_str})
               AND post_type = 'qe_lesson'
               AND post_status IN ('publish', 'draft', 'private')
             ORDER BY post_title ASC",
            ARRAY_A
        );

        $lessons = array_map(function ($row) {
            return [
                'id'    => (int) $row['ID'],
                'title' => $row['post_title'],
            ];
        }, $lessons_raw);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'lessons'        => $lessons,
                'question_count' => count($question_ids),
            ]
        ], 200);
    }

    /**
     * Provider analysis — all questions for a provider with lesson/quiz/course breakdown.
     * Uses bulk queries (no N+1) so it stays fast even with hundreds of questions.
     *
     * GET /wp-json/quiz-extended/v1/debug/provider-analysis?slug=david
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function provider_analysis($request)
    {
        global $wpdb;
        $slug = sanitize_title($request->get_param('slug'));

        // Resolve the term
        $term = get_term_by('slug', $slug, 'qe_provider');
        if (!$term) {
            $term = get_term_by('name', $slug, 'qe_provider');
        }
        if (!$term) {
            return new WP_REST_Response([
                'success' => false,
                'message' => "Provider '{$slug}' not found in qe_provider taxonomy"
            ], 404);
        }

        // 1. All question IDs for this provider
        $question_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT tr.object_id
             FROM {$wpdb->term_relationships} tr
             JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
             JOIN {$wpdb->posts} p ON tr.object_id = p.ID
             WHERE tt.term_id = %d
               AND tt.taxonomy = 'qe_provider'
               AND p.post_type = 'qe_question'
               AND p.post_status != 'trash'
             ORDER BY tr.object_id ASC",
            $term->term_id
        ));

        if (empty($question_ids)) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'provider'        => ['id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug],
                    'total_questions' => 0,
                    'stats'           => [],
                    'questions'       => [],
                ]
            ], 200);
        }

        $ids_str = implode(',', array_map('intval', $question_ids));

        // 2. Post titles + status in one query
        $posts_map = [];
        foreach ($wpdb->get_results(
            "SELECT ID, post_title, post_status FROM {$wpdb->posts} WHERE ID IN ({$ids_str})",
            ARRAY_A
        ) as $row) {
            $posts_map[(int)$row['ID']] = $row;
        }

        // 3. Relevant meta for all questions in one query
        $meta_map = []; // question_id => [meta_key => value]
        $meta_rows = $wpdb->get_results(
            "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta}
             WHERE post_id IN ({$ids_str})
               AND meta_key IN ('_question_lesson', '_lesson_ids', '_course_ids', '_course_id', '_difficulty_level')
             ORDER BY post_id, meta_key",
            ARRAY_A
        );
        foreach ($meta_rows as $row) {
            $val = $row['meta_value'];
            $uns = @maybe_unserialize($val);
            if ($uns !== $val) { $val = $uns; }
            else { $j = json_decode($val, true); if ($j !== null) $val = $j; }
            $meta_map[(int)$row['post_id']][$row['meta_key']] = $val;
        }

        // 4. Build question_id → quizzes map by scanning ALL quiz _quiz_question_ids at once
        $q_to_quizzes = []; // question_id => [{quiz_id, quiz_title}]
        $quiz_meta_rows = $wpdb->get_results(
            "SELECT pm.post_id AS quiz_id, p.post_title AS quiz_title, pm.meta_value
             FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key = '_quiz_question_ids'
               AND p.post_type = 'qe_quiz'",
            ARRAY_A
        );
        foreach ($quiz_meta_rows as $row) {
            $ids = @maybe_unserialize($row['meta_value']);
            if (!is_array($ids)) { $ids = json_decode($row['meta_value'], true); }
            if (!is_array($ids)) continue;
            foreach ($ids as $qid) {
                $qid = (int) $qid;
                if (!isset($q_to_quizzes[$qid])) $q_to_quizzes[$qid] = [];
                $q_to_quizzes[$qid][] = ['quiz_id' => (int)$row['quiz_id'], 'quiz_title' => $row['quiz_title']];
            }
        }

        // 5. Collect all unique lesson IDs then resolve them in one query
        $all_lesson_ids = [];
        foreach ($question_ids as $qid) {
            $qid = (int) $qid;
            $m = $meta_map[$qid] ?? [];
            if (!empty($m['_question_lesson'])) $all_lesson_ids[] = (int)$m['_question_lesson'];
            if (!empty($m['_lesson_ids']) && is_array($m['_lesson_ids'])) {
                foreach ($m['_lesson_ids'] as $lid) $all_lesson_ids[] = (int)$lid;
            }
        }
        $all_lesson_ids = array_values(array_unique(array_filter($all_lesson_ids)));

        $lessons_map = [];
        if (!empty($all_lesson_ids)) {
            $lids_str = implode(',', $all_lesson_ids);
            foreach ($wpdb->get_results(
                "SELECT ID, post_title, post_status FROM {$wpdb->posts} WHERE ID IN ({$lids_str})",
                ARRAY_A
            ) as $row) {
                $lessons_map[(int)$row['ID']] = $row;
            }
        }

        // 6. Build per-question data + aggregate stats
        $stats = [
            'has_question_lesson_only'  => 0, // old field, no new _lesson_ids
            'has_lesson_ids'            => 0, // new normalized field populated
            'has_course_ids'            => 0, // course linked
            'has_no_lesson_at_all'      => 0, // neither field exists
            'in_a_quiz'                 => 0,
            'not_in_any_quiz'           => 0,
        ];

        $questions = [];
        foreach ($question_ids as $qid) {
            $qid = (int) $qid;
            $m    = $meta_map[$qid] ?? [];
            $post = $posts_map[$qid] ?? [];

            $has_legacy    = !empty($m['_question_lesson']);
            $has_new       = !empty($m['_lesson_ids']) && is_array($m['_lesson_ids']) && count($m['_lesson_ids']) > 0;
            $has_courses   = !empty($m['_course_ids']) && is_array($m['_course_ids']) && count($m['_course_ids']) > 0;
            $in_quiz       = !empty($q_to_quizzes[$qid]);

            if ($has_legacy && !$has_new) $stats['has_question_lesson_only']++;
            if ($has_new) $stats['has_lesson_ids']++;
            if ($has_courses) $stats['has_course_ids']++;
            if (!$has_legacy && !$has_new) $stats['has_no_lesson_at_all']++;
            if ($in_quiz) $stats['in_a_quiz']++; else $stats['not_in_any_quiz']++;

            // Build lesson references
            $lesson_refs = [];
            if ($has_legacy) {
                $lid = (int)$m['_question_lesson'];
                $lesson_refs[] = [
                    'via'    => '_question_lesson (legacy)',
                    'id'     => $lid,
                    'title'  => $lessons_map[$lid]['post_title'] ?? '(not found)',
                    'status' => $lessons_map[$lid]['post_status'] ?? null,
                ];
            }
            if ($has_new) {
                foreach ($m['_lesson_ids'] as $lid) {
                    $lid = (int)$lid;
                    $lesson_refs[] = [
                        'via'    => '_lesson_ids (new)',
                        'id'     => $lid,
                        'title'  => $lessons_map[$lid]['post_title'] ?? '(not found)',
                        'status' => $lessons_map[$lid]['post_status'] ?? null,
                    ];
                }
            }

            $questions[] = [
                'question_id'     => $qid,
                'question_title'  => $post['post_title'] ?? '(not found)',
                'question_status' => $post['post_status'] ?? null,
                'difficulty'      => $m['_difficulty_level'] ?? null,
                'lesson_refs'     => $lesson_refs,
                'course_ids'      => $has_courses ? array_map('intval', (array)$m['_course_ids']) : [],
                'quizzes'         => $q_to_quizzes[$qid] ?? [],
                'flags'           => [
                    'has_question_lesson' => $has_legacy,
                    'has_lesson_ids'      => $has_new,
                    'has_course_ids'      => $has_courses,
                    'in_quiz'             => $in_quiz,
                ],
            ];
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'provider'        => ['id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug],
                'total_questions' => count($question_ids),
                'stats'           => $stats,
                'questions'       => $questions,
            ]
        ], 200);
    }

    /**
     * Question chain analysis - full graph traversal from a single question ID.
     *
     * Returns: question data → quizzes that contain it → lessons those quizzes
     * belong to → courses those lessons belong to. Also reads the question's own
     * meta IDs and cross-checks them against the chain for inconsistencies.
     *
     * GET /wp-json/quiz-extended/v1/debug/question-chain?id=123
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function question_chain($request)
    {
        global $wpdb;
        $q_id = (int) $request->get_param('id');

        // ── Helper: deserialize a raw meta string ──────────────────────────────
        $decode = function ($raw) {
            if ($raw === null || $raw === '') return $raw;
            $unserialized = @maybe_unserialize($raw);
            if ($unserialized !== $raw) return $unserialized;
            $json = json_decode($raw, true);
            return ($json !== null) ? $json : $raw;
        };

        // ── Helper: fetch a single post's basic info ───────────────────────────
        $get_post_info = function ($id) use ($wpdb) {
            if (!$id) return null;
            return $wpdb->get_row($wpdb->prepare(
                "SELECT ID, post_title, post_status, post_type FROM {$wpdb->posts} WHERE ID = %d",
                (int) $id
            ), ARRAY_A);
        };

        // ── Helper: get all deserialized meta for a post ───────────────────────
        $get_meta = function ($id) use ($wpdb, $decode) {
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_key",
                (int) $id
            ), ARRAY_A);
            $out = [];
            foreach ($rows as $r) {
                $out[$r['meta_key']] = $decode($r['meta_value']);
            }
            return $out;
        };

        // ── 1. Question itself ─────────────────────────────────────────────────
        $q_post = $wpdb->get_row($wpdb->prepare(
            "SELECT ID, post_title, post_status, post_type FROM {$wpdb->posts}
             WHERE ID = %d AND post_type = 'qe_question'",
            $q_id
        ), ARRAY_A);

        if (!$q_post) {
            return new WP_REST_Response([
                'success' => false,
                'message' => "No question found with ID {$q_id}"
            ], 404);
        }

        $q_meta = $get_meta($q_id);

        // Taxonomy terms
        $tax_names = get_object_taxonomies('qe_question');
        $q_taxonomies = [];
        if (!empty($tax_names)) {
            foreach (wp_get_object_terms($q_id, $tax_names) as $term) {
                $q_taxonomies[$term->taxonomy][] = [
                    'id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug
                ];
            }
        }

        // IDs declared in question's own meta
        $meta_course_ids = is_array($q_meta['_course_ids'] ?? null) ? array_map('intval', $q_meta['_course_ids']) : [];
        $meta_lesson_ids = is_array($q_meta['_lesson_ids'] ?? null) ? array_map('intval', $q_meta['_lesson_ids']) : [];
        if (!empty($q_meta['_course_id']))     $meta_course_ids[] = (int) $q_meta['_course_id'];
        if (!empty($q_meta['_question_lesson'])) $meta_lesson_ids[] = (int) $q_meta['_question_lesson'];
        $meta_course_ids = array_values(array_unique(array_filter($meta_course_ids)));
        $meta_lesson_ids = array_values(array_unique(array_filter($meta_lesson_ids)));

        // ── 2. Quizzes that contain this question ──────────────────────────────
        // _quiz_question_ids is a serialized PHP array or JSON array
        $quiz_rows = $wpdb->get_results($wpdb->prepare(
            "SELECT p.ID, p.post_title, p.post_status, pm.meta_value AS raw_ids
             FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key = '_quiz_question_ids'
               AND p.post_type = 'qe_quiz'
               AND (
                   pm.meta_value LIKE %s
                   OR pm.meta_value LIKE %s
                   OR pm.meta_value = %s
               )",
            '%i:' . $q_id . ';%',
            '%"' . $q_id . '"%',
            (string) $q_id
        ), ARRAY_A);

        // ── 3. For each quiz → find referencing lessons → find their course ────
        $chain = [];
        $chain_quiz_ids    = [];
        $chain_lesson_ids  = [];
        $chain_course_ids  = [];

        foreach ($quiz_rows as $quiz_row) {
            $quiz_id    = (int) $quiz_row['ID'];
            $quiz_meta  = $get_meta($quiz_id);
            $q_ids_in_quiz = $decode($quiz_row['raw_ids']);
            // Normalize to array of ints
            if (!is_array($q_ids_in_quiz)) $q_ids_in_quiz = [$q_ids_in_quiz];
            $q_ids_in_quiz = array_map('intval', $q_ids_in_quiz);

            $chain_quiz_ids[] = $quiz_id;

            // Lessons referencing this quiz via _quiz_ids
            $lessons_via_quiz_ids = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key = '_quiz_ids'
                   AND p.post_type = 'qe_lesson'
                   AND (pm.meta_value LIKE %s OR pm.meta_value LIKE %s)",
                '%i:' . $quiz_id . ';%',
                '%"' . $quiz_id . '"%'
            ), ARRAY_A);
            $lesson_ids_a = array_column($lessons_via_quiz_ids, 'ID');

            // Lessons referencing this quiz via _lesson_steps
            $lessons_via_steps = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID FROM {$wpdb->postmeta} pm
                 JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE pm.meta_key = '_lesson_steps'
                   AND p.post_type = 'qe_lesson'
                   AND pm.meta_value LIKE %s",
                '%' . $quiz_id . '%'
            ), ARRAY_A);
            $lesson_ids_b = array_column($lessons_via_steps, 'ID');

            $all_lesson_ids = array_values(array_unique(array_merge($lesson_ids_a, $lesson_ids_b)));

            // Build lesson details with their course
            $lessons_detail = [];
            foreach ($all_lesson_ids as $l_id) {
                $l_id = (int) $l_id;
                $lesson_info = $get_post_info($l_id);
                $lesson_meta = $get_meta($l_id);
                $course_id   = (int) ($lesson_meta['_course_id'] ?? 0);
                $course_info = $course_id ? $get_post_info($course_id) : null;

                $chain_lesson_ids[] = $l_id;
                if ($course_id) $chain_course_ids[] = $course_id;

                $lessons_detail[] = [
                    'lesson_id'     => $l_id,
                    'lesson_title'  => $lesson_info['post_title'] ?? '(not found)',
                    'lesson_status' => $lesson_info['post_status'] ?? '?',
                    'found_via'     => in_array($l_id, $lesson_ids_a) ? '_quiz_ids' : '_lesson_steps',
                    'course' => $course_id ? [
                        'course_id'     => $course_id,
                        'course_title'  => $course_info['post_title'] ?? '(not found)',
                        'course_status' => $course_info['post_status'] ?? '?',
                    ] : null,
                ];
            }

            $chain[] = [
                'quiz_id'              => $quiz_id,
                'quiz_title'           => $quiz_row['post_title'],
                'quiz_status'          => $quiz_row['post_status'],
                'quiz_course_id_meta'  => (int) ($quiz_meta['_course_id'] ?? 0),
                'question_ids_in_quiz' => $q_ids_in_quiz,
                'lessons'              => $lessons_detail,
            ];
        }

        $chain_course_ids  = array_values(array_unique(array_filter($chain_course_ids)));
        $chain_lesson_ids  = array_values(array_unique(array_filter($chain_lesson_ids)));

        // ── 4. Resolve meta IDs to titles ──────────────────────────────────────
        $resolve_ids = function ($ids, $label) use ($wpdb) {
            $out = [];
            foreach ($ids as $rid) {
                $rid = (int) $rid;
                if (!$rid) continue;
                $row = $wpdb->get_row($wpdb->prepare(
                    "SELECT ID, post_title, post_status, post_type FROM {$wpdb->posts} WHERE ID = %d",
                    $rid
                ), ARRAY_A);
                $out[] = $row
                    ? ['id' => $rid, 'title' => $row['post_title'], 'status' => $row['post_status'], 'post_type' => $row['post_type']]
                    : ['id' => $rid, 'title' => '(not found)', 'status' => null, 'post_type' => null];
            }
            return $out;
        };

        $meta_courses_resolved = $resolve_ids($meta_course_ids, 'course');
        $meta_lessons_resolved = $resolve_ids($meta_lesson_ids, 'lesson');

        // ── 5. Inconsistency analysis ──────────────────────────────────────────
        $warnings = [];

        // Quizzes found by reverse lookup but not declared in question meta
        $undeclared_quiz_courses = [];
        foreach ($chain as $entry) {
            $quiz_course = $entry['quiz_course_id_meta'];
            if ($quiz_course && !in_array($quiz_course, $meta_course_ids)) {
                $warnings[] = "Quiz #{$entry['quiz_id']} ({$entry['quiz_title']}) has _course_id={$quiz_course} but that course is NOT in the question's _course_ids.";
            }
            foreach ($entry['lessons'] as $l) {
                if (!$l['course']) {
                    $warnings[] = "Lesson #{$l['lesson_id']} ({$l['lesson_title']}) has no _course_id set.";
                } elseif (!in_array($l['course']['course_id'], $meta_course_ids)) {
                    $warnings[] = "Lesson #{$l['lesson_id']} ({$l['lesson_title']}) points to course #{$l['course']['course_id']} but that is NOT in the question's _course_ids.";
                }
                if (!in_array($l['lesson_id'], $meta_lesson_ids)) {
                    $warnings[] = "Lesson #{$l['lesson_id']} ({$l['lesson_title']}) references this quiz but is NOT in the question's _lesson_ids.";
                }
            }
            if (empty($entry['lessons'])) {
                $warnings[] = "Quiz #{$entry['quiz_id']} ({$entry['quiz_title']}) contains this question but is NOT referenced by any lesson.";
            }
        }
        // Meta IDs that have no chain match
        foreach ($meta_lesson_ids as $mid) {
            if (!in_array($mid, $chain_lesson_ids)) {
                $t = $wpdb->get_var($wpdb->prepare("SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $mid));
                $warnings[] = "Question's _lesson_ids contains lesson #{$mid} (" . ($t ?: 'not found') . ") but no quiz found in that lesson references this question.";
            }
        }
        foreach ($meta_course_ids as $cid) {
            if (!in_array($cid, $chain_course_ids)) {
                $t = $wpdb->get_var($wpdb->prepare("SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $cid));
                $warnings[] = "Question's _course_ids contains course #{$cid} (" . ($t ?: 'not found') . ") but no chain path reaches that course.";
            }
        }
        if (empty($quiz_rows)) {
            $warnings[] = "No quiz found that lists this question in _quiz_question_ids.";
        }

        // ── 6. Response ────────────────────────────────────────────────────────
        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'question' => [
                    'id'         => $q_id,
                    'title'      => $q_post['post_title'],
                    'status'     => $q_post['post_status'],
                    'taxonomies' => $q_taxonomies,
                    'meta_ids'   => [
                        '_course_ids'       => $q_meta['_course_ids'] ?? null,
                        '_lesson_ids'       => $q_meta['_lesson_ids'] ?? null,
                        '_course_id'        => $q_meta['_course_id'] ?? null,
                        '_question_lesson'  => $q_meta['_question_lesson'] ?? null,
                    ],
                ],
                'chain' => $chain,
                'meta_resolved' => [
                    'courses' => $meta_courses_resolved,
                    'lessons' => $meta_lessons_resolved,
                ],
                'summary' => [
                    'quiz_ids_found_by_reverse_lookup'   => $chain_quiz_ids,
                    'lesson_ids_found_by_reverse_lookup' => $chain_lesson_ids,
                    'course_ids_found_by_reverse_lookup' => $chain_course_ids,
                    'course_ids_in_question_meta'        => $meta_course_ids,
                    'lesson_ids_in_question_meta'        => $meta_lesson_ids,
                    'warnings'                           => $warnings,
                    'is_consistent'                      => empty($warnings),
                ],
            ]
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

    /**
     * Get autoload options status
     * 
     * GET /wp-json/quiz-extended/v1/debug/autoload-status
     */
    public function get_autoload_status($request)
    {
        global $wpdb;

        try {
            $stats = [];

            // QE transients
            $stats['qe_transients'] = (int) $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->options} 
                 WHERE option_name LIKE '_transient_qe_%' 
                 OR option_name LIKE '_transient_timeout_qe_%'"
            );

            // Rate limit transients
            $stats['rate_limit_transients'] = (int) $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->options} 
                 WHERE option_name LIKE '_transient_qe_rate_limit_%' 
                 OR option_name LIKE '_transient_timeout_qe_rate_limit_%'"
            );

            // Login transients
            $stats['login_transients'] = (int) $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->options} 
                 WHERE option_name LIKE '_transient_qe_login_%' 
                 OR option_name LIKE '_transient_timeout_qe_login_%'"
            );

            // qem_map_* legacy options (quiz, lesson, course, etc.)
            $stats['qem_map_options'] = (int) $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->options} 
                 WHERE option_name LIKE 'qem_map_%'"
            );

            // For backwards compatibility
            $stats['qem_map_quiz_options'] = $stats['qem_map_options'];

            // Options with autoload='yes'
            $stats['qe_autoload_yes'] = (int) $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->options} 
                 WHERE autoload = 'yes' 
                 AND (option_name LIKE '_transient_qe_%' 
                      OR option_name LIKE '_transient_timeout_qe_%'
                      OR option_name LIKE 'qem_map_%')"
            );

            // Total autoload size
            $autoload_size = $wpdb->get_var(
                "SELECT ROUND(SUM(LENGTH(option_value)) / 1024 / 1024, 2) 
                 FROM {$wpdb->options} 
                 WHERE autoload = 'yes'"
            );
            $stats['total_autoload_size_mb'] = $autoload_size ? (float) $autoload_size : 0;

            // Size of problematic options  
            $problematic_size = $wpdb->get_var(
                "SELECT ROUND(SUM(LENGTH(option_value)) / 1024 / 1024, 2) 
                 FROM {$wpdb->options} 
                 WHERE option_name LIKE '_transient_qe_%' 
                 OR option_name LIKE 'qem_map_%'"
            );
            $stats['problematic_options_size_mb'] = $problematic_size ? (float) $problematic_size : 0;

            // Alias for frontend compatibility
            $stats['autoload_size_mb'] = $stats['total_autoload_size_mb'];

            return new WP_REST_Response([
                'success' => true,
                'data' => $stats,
                'recommendation' => $stats['qe_transients'] > 100 || $stats['qem_map_options'] > 0
                    ? 'Se recomienda ejecutar limpieza POST /debug/cleanup-autoload'
                    : 'Todo OK, no se requiere limpieza'
            ], 200);
        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Cleanup autoload options
     * 
     * POST /wp-json/quiz-extended/v1/debug/cleanup-autoload
     */
    public function cleanup_autoload_options($request)
    {
        global $wpdb;

        $results = [
            'before' => [],
            'deleted' => [],
            'after' => []
        ];

        // BEFORE stats
        $results['before']['qe_transients'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_qe_%' 
             OR option_name LIKE '_transient_timeout_qe_%'"
        );
        $results['before']['qem_map_quiz'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->options} 
             WHERE option_name LIKE 'qem_map_%'"
        );
        $results['before']['autoload_size_mb'] = (float) $wpdb->get_var(
            "SELECT ROUND(SUM(LENGTH(option_value)) / 1024 / 1024, 2) 
             FROM {$wpdb->options} WHERE autoload = 'yes'"
        );

        // 1. Delete ALL qem_map_* legacy options (quiz, lesson, course, etc.)
        $results['deleted']['qem_map_quiz'] = (int) $wpdb->query(
            "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'qem_map_%'"
        );

        // 2. Delete rate limit transients
        $results['deleted']['rate_limit_transients'] = (int) $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_qe_rate_limit_%' 
             OR option_name LIKE '_transient_timeout_qe_rate_limit_%'"
        );

        // 3. Delete violations transients
        $results['deleted']['violations_transients'] = (int) $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_qe_rate_limit_violations_%' 
             OR option_name LIKE '_transient_timeout_qe_rate_limit_violations_%'"
        );

        // 4. Delete login transients
        $results['deleted']['login_transients'] = (int) $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_qe_login_%' 
             OR option_name LIKE '_transient_timeout_qe_login_%'"
        );

        // 5. Delete expired QE transients
        $current_time = time();
        $results['deleted']['expired_transients'] = (int) $wpdb->query($wpdb->prepare(
            "DELETE a, b FROM {$wpdb->options} a
             LEFT JOIN {$wpdb->options} b 
             ON b.option_name = REPLACE(a.option_name, '_transient_timeout_', '_transient_')
             WHERE a.option_name LIKE '_transient_timeout_qe_%%'
             AND CAST(a.option_value AS UNSIGNED) < %d",
            $current_time
        ));

        // 6. Update remaining QE options to autoload='no'
        $results['deleted']['updated_autoload'] = (int) $wpdb->query(
            "UPDATE {$wpdb->options} 
             SET autoload = 'no' 
             WHERE autoload = 'yes' 
             AND (option_name LIKE '_transient_qe_%' 
                  OR option_name LIKE '_transient_timeout_qe_%'
                  OR option_name LIKE 'qe_rate_limit%'
                  OR option_name LIKE 'qe_notification_debug%')"
        );

        // 7. Clean notification debug log
        $debug_log = get_option('qe_notification_debug_log', []);
        if (count($debug_log) > 20) {
            update_option('qe_notification_debug_log', array_slice($debug_log, -20), false);
            $results['deleted']['debug_log_trimmed'] = true;
        }

        // AFTER stats
        $results['after']['qe_transients'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_qe_%' 
             OR option_name LIKE '_transient_timeout_qe_%'"
        );
        $results['after']['qem_map_quiz'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->options} 
             WHERE option_name LIKE 'qem_map_%'"
        );
        $results['after']['autoload_size_mb'] = (float) $wpdb->get_var(
            "SELECT ROUND(SUM(LENGTH(option_value)) / 1024 / 1024, 2) 
             FROM {$wpdb->options} WHERE autoload = 'yes'"
        );

        // Calculate savings
        $results['ram_freed_mb'] = round(
            $results['before']['autoload_size_mb'] - $results['after']['autoload_size_mb'],
            2
        );

        // Flush cache
        wp_cache_flush();

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Limpieza completada exitosamente',
            'data' => $results
        ], 200);
    }
}