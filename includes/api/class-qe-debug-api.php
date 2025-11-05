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