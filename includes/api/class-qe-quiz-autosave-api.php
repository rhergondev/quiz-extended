<?php
/**
 * QE_Quiz_Autosave_API Class
 *
 * Handles REST API endpoints for quiz autosave functionality.
 * Allows users to save and recover quiz progress in case of interruptions.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Quiz_Autosave_API extends QE_API_Base
{
    /**
     * Constructor - Override to add error handling
     */
    public function __construct()
    {
        try {
            parent::__construct();
        } catch (Exception $e) {
            error_log('QE_Quiz_Autosave_API constructor error: ' . $e->getMessage());
            // Still register routes even if parent fails
            add_action('rest_api_init', [$this, 'register_routes']);
        }
    }

    /**
     * Register REST API routes
     *
     * @since 2.0.0
     */
    public function register_routes()
    {
        // Save quiz progress
        register_rest_route($this->namespace, '/quiz-autosave', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'save_progress'],
                'permission_callback' => function () {
                    return is_user_logged_in();
                },
                'args' => [
                    'quiz_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                        'validate_callback' => function ($param) {
                            return $param > 0;
                        }
                    ],
                    'attempt_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'quiz_data' => [
                        'required' => true,
                        'type' => 'object',
                    ],
                    'current_question_index' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'answers' => [
                        'required' => true,
                        'type' => 'object',
                    ],
                    'time_remaining' => [
                        'required' => false,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);

        // Get latest autosaved quiz
        register_rest_route($this->namespace, '/quiz-autosave/latest', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_latest_autosave'],
                'permission_callback' => function () {
                    return is_user_logged_in();
                },
            ],
        ]);

        // Get autosave for specific quiz
        register_rest_route($this->namespace, '/quiz-autosave/(?P<quiz_id>\d+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_quiz_autosave'],
                'permission_callback' => function () {
                    return is_user_logged_in();
                },
                'args' => [
                    'quiz_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);

        // Delete autosave
        register_rest_route($this->namespace, '/quiz-autosave/(?P<quiz_id>\d+)', [
            [
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => [$this, 'delete_autosave'],
                'permission_callback' => function () {
                    return is_user_logged_in();
                },
                'args' => [
                    'quiz_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);

        // Delete all autosaves for current user
        register_rest_route($this->namespace, '/quiz-autosave/clear-all', [
            [
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => [$this, 'clear_all_autosaves'],
                'permission_callback' => function () {
                    return is_user_logged_in();
                },
            ],
        ]);
    }

    /**
     * Save quiz progress
     *
     * @param WP_REST_Request $request Full request data
     * @return WP_REST_Response|WP_Error Response object
     * @since 2.0.0
     */
    public function save_progress($request)
    {
        global $wpdb;

        try {
            $user_id = get_current_user_id();

            if (!$user_id) {
                return new WP_Error(
                    'not_authenticated',
                    __('User must be logged in', 'quiz-extended'),
                    ['status' => 401]
                );
            }

            $quiz_id = $request->get_param('quiz_id');
            $attempt_id = $request->get_param('attempt_id');
            $quiz_data = $request->get_param('quiz_data');
            $current_question_index = $request->get_param('current_question_index');
            $answers = $request->get_param('answers');
            $time_remaining = $request->get_param('time_remaining');

            // Validate required params
            if (!$quiz_id || !$quiz_data || !is_array($answers)) {
                return new WP_Error(
                    'invalid_params',
                    __('Missing required parameters', 'quiz-extended'),
                    ['status' => 400]
                );
            }

            // Serialize data
            $quiz_data_json = wp_json_encode($quiz_data);
            $answers_json = wp_json_encode($answers);

            if ($quiz_data_json === false || $answers_json === false) {
                return new WP_Error(
                    'json_encode_error',
                    __('Failed to encode data to JSON', 'quiz-extended'),
                    ['status' => 500]
                );
            }

            $table = $wpdb->prefix . 'qe_quiz_autosave';
            $now = current_time('mysql');

            // Check if autosave already exists for this user/quiz
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT autosave_id FROM {$table} WHERE user_id = %d AND quiz_id = %d",
                $user_id,
                $quiz_id
            ));

            if ($existing) {
                // Update existing autosave
                $result = $wpdb->update(
                    $table,
                    [
                        'attempt_id' => $attempt_id,
                        'quiz_data' => $quiz_data_json,
                        'current_question_index' => $current_question_index,
                        'answers' => $answers_json,
                        'time_remaining' => $time_remaining,
                        'updated_at' => $now,
                    ],
                    [
                        'user_id' => $user_id,
                        'quiz_id' => $quiz_id,
                    ],
                    ['%d', '%s', '%d', '%s', '%d', '%s'],
                    ['%d', '%d']
                );
            } else {
                // Insert new autosave
                $result = $wpdb->insert(
                    $table,
                    [
                        'user_id' => $user_id,
                        'quiz_id' => $quiz_id,
                        'attempt_id' => $attempt_id,
                        'quiz_data' => $quiz_data_json,
                        'current_question_index' => $current_question_index,
                        'answers' => $answers_json,
                        'time_remaining' => $time_remaining,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                    ['%d', '%d', '%d', '%s', '%d', '%s', '%d', '%s', '%s']
                );
            }

            if ($result === false) {
                return new WP_Error(
                    'autosave_failed',
                    sprintf(__('Database error: %s', 'quiz-extended'), $wpdb->last_error),
                    ['status' => 500]
                );
            }

            return rest_ensure_response([
                'success' => true,
                'message' => __('Progress saved successfully', 'quiz-extended'),
                'data' => [
                    'quiz_id' => $quiz_id,
                    'saved_at' => $now,
                ],
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'autosave_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Get latest autosaved quiz for current user
     *
     * @param WP_REST_Request $request Full request data
     * @return WP_REST_Response|WP_Error Response object
     * @since 2.0.0
     */
    public function get_latest_autosave($request)
    {
        global $wpdb;

        try {
            $user_id = get_current_user_id();
            $table = $wpdb->prefix . 'qe_quiz_autosave';

            $autosave = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table} WHERE user_id = %d ORDER BY updated_at DESC LIMIT 1",
                $user_id
            ));

            if (!$autosave) {
                return rest_ensure_response([
                    'success' => true,
                    'data' => null,
                ]);
            }

            // Get quiz title
            $quiz_title = get_the_title($autosave->quiz_id);

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'autosave_id' => (int) $autosave->autosave_id,
                    'quiz_id' => (int) $autosave->quiz_id,
                    'quiz_title' => $quiz_title,
                    'attempt_id' => $autosave->attempt_id ? (int) $autosave->attempt_id : null,
                    'quiz_data' => json_decode($autosave->quiz_data, true),
                    'current_question_index' => (int) $autosave->current_question_index,
                    'answers' => json_decode($autosave->answers, true),
                    'time_remaining' => $autosave->time_remaining ? (int) $autosave->time_remaining : null,
                    'updated_at' => $autosave->updated_at,
                ],
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'autosave_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Get autosave for specific quiz
     *
     * @param WP_REST_Request $request Full request data
     * @return WP_REST_Response|WP_Error Response object
     * @since 2.0.0
     */
    public function get_quiz_autosave($request)
    {
        global $wpdb;

        try {
            $user_id = get_current_user_id();
            $quiz_id = $request->get_param('quiz_id');
            $table = $wpdb->prefix . 'qe_quiz_autosave';

            $autosave = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table} WHERE user_id = %d AND quiz_id = %d",
                $user_id,
                $quiz_id
            ));

            if (!$autosave) {
                return rest_ensure_response([
                    'success' => true,
                    'data' => null,
                ]);
            }

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'autosave_id' => (int) $autosave->autosave_id,
                    'quiz_id' => (int) $autosave->quiz_id,
                    'attempt_id' => $autosave->attempt_id ? (int) $autosave->attempt_id : null,
                    'quiz_data' => json_decode($autosave->quiz_data, true),
                    'current_question_index' => (int) $autosave->current_question_index,
                    'answers' => json_decode($autosave->answers, true),
                    'time_remaining' => $autosave->time_remaining ? (int) $autosave->time_remaining : null,
                    'updated_at' => $autosave->updated_at,
                ],
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'autosave_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Delete autosave for specific quiz
     *
     * @param WP_REST_Request $request Full request data
     * @return WP_REST_Response|WP_Error Response object
     * @since 2.0.0
     */
    public function delete_autosave($request)
    {
        global $wpdb;

        try {
            $user_id = get_current_user_id();
            $quiz_id = $request->get_param('quiz_id');
            $table = $wpdb->prefix . 'qe_quiz_autosave';

            $result = $wpdb->delete(
                $table,
                [
                    'user_id' => $user_id,
                    'quiz_id' => $quiz_id,
                ],
                ['%d', '%d']
            );

            return rest_ensure_response([
                'success' => true,
                'message' => __('Autosave deleted successfully', 'quiz-extended'),
                'deleted' => $result > 0,
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'autosave_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Clear all autosaves for current user
     *
     * @param WP_REST_Request $request Full request data
     * @return WP_REST_Response|WP_Error Response object
     * @since 2.0.0
     */
    public function clear_all_autosaves($request)
    {
        global $wpdb;

        try {
            $user_id = get_current_user_id();
            $table = $wpdb->prefix . 'qe_quiz_autosave';

            $result = $wpdb->delete(
                $table,
                ['user_id' => $user_id],
                ['%d']
            );

            return rest_ensure_response([
                'success' => true,
                'message' => __('All autosaves cleared successfully', 'quiz-extended'),
                'deleted' => $result,
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'autosave_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
}

// Initialize the API
new QE_Quiz_Autosave_API();
