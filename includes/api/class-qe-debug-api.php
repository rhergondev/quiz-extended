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
    }

    /**
     * Get capabilities debug info

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
}