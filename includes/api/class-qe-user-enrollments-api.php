<?php
/**
 * QE_User_Enrollments_API Class
 *
 * Handles user enrollment management API endpoints
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

class QE_User_Enrollments_API extends QE_API_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        $this->namespace = 'qe/v1';
        $this->rest_base = 'users';

        // CRITICAL: Call parent constructor to register rest_api_init hook
        parent::__construct();
    }

    /**
     * Register API routes
     *
     * @return void
     */
    public function register_routes()
    {
        // Get user enrollments
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<user_id>\d+)/enrollments', [
            'methods' => 'GET',
            'callback' => [$this, 'get_user_enrollments'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'user_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);

        // Enroll user in course
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<user_id>\d+)/enrollments', [
            'methods' => 'POST',
            'callback' => [$this, 'enroll_user'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'user_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ],
                'course_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);

        // Unenroll user from course
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<user_id>\d+)/enrollments/(?P<course_id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'unenroll_user'],
            'permission_callback' => [$this, 'permissions_check'],
            'args' => [
                'user_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ],
                'course_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);
    }

    /**
     * Get user enrollments
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_user_enrollments($request)
    {
        try {
            $user_id = $request['user_id'];

            // Verify user exists
            $user = get_user_by('id', $user_id);
            if (!$user) {
                return new WP_REST_Response([
                    'success' => false,
                    'error' => 'User not found'
                ], 404);
            }

            // Get real enrollment data from user meta
            $enrollments = $this->get_user_enrollments_from_meta($user_id);

            return new WP_REST_Response([
                'success' => true,
                'data' => $enrollments,
                'total' => count($enrollments),
                'user_id' => $user_id
            ], 200);

        } catch (Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enroll user in course
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function enroll_user($request)
    {
        try {
            $user_id = $request['user_id'];
            $course_id = $request['course_id'];

            // Verify user exists
            $user = get_user_by('id', $user_id);
            if (!$user) {
                return new WP_REST_Response([
                    'success' => false,
                    'error' => 'User not found'
                ], 404);
            }

            // Verify course exists
            $course = get_post($course_id);
            if (!$course || $course->post_type !== 'qe_course') {
                return new WP_REST_Response([
                    'success' => false,
                    'error' => 'Course not found'
                ], 404);
            }

            // Add enrollment meta
            $enrollment_date = current_time('mysql');
            update_user_meta($user_id, "_enrolled_course_{$course_id}", 'yes'); // Cambiar de true a 'yes' para consistencia
            update_user_meta($user_id, "_enrolled_course_{$course_id}_date", $enrollment_date);
            update_user_meta($user_id, "_course_{$course_id}_progress", 0);

            return new WP_REST_Response([
                'success' => true,
                'message' => 'User enrolled successfully',
                'data' => [
                    'user_id' => $user_id,
                    'course_id' => $course_id,
                    'enrollment_date' => $enrollment_date,
                    'progress' => 0
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
     * Unenroll user from course
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function unenroll_user($request)
    {
        try {
            $user_id = $request['user_id'];
            $course_id = $request['course_id'];

            // Remove enrollment meta
            delete_user_meta($user_id, "_enrolled_course_{$course_id}");
            delete_user_meta($user_id, "_enrolled_course_{$course_id}_date");
            delete_user_meta($user_id, "_course_{$course_id}_progress");

            return new WP_REST_Response([
                'success' => true,
                'message' => 'User unenrolled successfully',
                'data' => [
                    'user_id' => $user_id,
                    'course_id' => $course_id
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
     * Get user enrollments from user meta
     *
     * @param int $user_id User ID
     * @return array Array of enrollment objects
     */
    private function get_user_enrollments_from_meta($user_id)
    {
        global $wpdb;

        // Get all user meta keys that match enrollment pattern
        $meta_keys = $wpdb->get_col($wpdb->prepare(
            "SELECT meta_key FROM {$wpdb->usermeta} 
             WHERE user_id = %d 
             AND meta_key LIKE '_enrolled_course_%%'
             AND meta_key NOT LIKE '_enrolled_course_%%_date'
             AND meta_key NOT LIKE '_enrolled_course_%%_order_id'",
            $user_id
        ));

        $enrollments = [];

        foreach ($meta_keys as $meta_key) {
            // Extract course ID from meta key (_enrolled_course_42 -> 42)
            $course_id = str_replace('_enrolled_course_', '', $meta_key);

            if (!is_numeric($course_id)) {
                continue;
            }

            $course_id = absint($course_id);

            // Verify the enrollment is active
            $is_enrolled = get_user_meta($user_id, $meta_key, true);
            if (!$is_enrolled) {
                continue;
            }

            // Get course details
            $course = get_post($course_id);
            if (!$course || $course->post_type !== 'qe_course') {
                continue;
            }

            // Get enrollment metadata
            $enrollment_date = get_user_meta($user_id, "_enrolled_course_{$course_id}_date", true);
            $order_id = get_user_meta($user_id, "_enrolled_course_{$course_id}_order_id", true);
            $progress = get_user_meta($user_id, "_course_{$course_id}_progress", true);
            $last_activity = get_user_meta($user_id, "_course_{$course_id}_last_activity", true);

            // Build enrollment object
            $enrollments[] = [
                'id' => $course_id, // Using course_id as enrollment ID for now
                'user_id' => (int) $user_id,
                'course_id' => $course_id,
                'course_title' => $course->post_title,
                'enrollment_date' => $enrollment_date ?: current_time('mysql'),
                'progress' => $progress ? (int) $progress : 0,
                'status' => $progress >= 100 ? 'completed' : 'active',
                'last_activity' => $last_activity ?: $enrollment_date,
                'order_id' => $order_id ? (int) $order_id : null,
                'source' => $order_id ? 'purchase' : 'manual'
            ];
        }

        return $enrollments;
    }

    /**
     * Permission check for enrollment endpoints
     *
     * @param WP_REST_Request $request
     * @return bool
     */
    public function permissions_check($request)
    {
        // Allow if user has manage_options (admin) or can edit users
        return current_user_can('manage_options') || current_user_can('edit_users');
    }
}