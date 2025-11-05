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

            // For now, return simulated enrollment data
            // TODO: Replace with actual enrollment database queries
            $enrollments = $this->get_simulated_enrollments($user_id);

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
            update_user_meta($user_id, "_enrolled_course_{$course_id}", true);
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
     * Get simulated enrollment data for development
     *
     * @param int $user_id
     * @return array
     */
    private function get_simulated_enrollments($user_id)
    {
        // Generate some fake enrollments for testing
        $courses = get_posts([
            'post_type' => 'qe_course',
            'numberposts' => 10,
            'post_status' => ['publish', 'draft']
        ]);

        $enrollments = [];

        foreach ($courses as $course) {
            // Randomly enroll user in some courses
            if (rand(0, 100) > 60) { // 40% chance of enrollment
                $enrollments[] = [
                    'id' => rand(1000, 9999),
                    'user_id' => (int) $user_id,
                    'course_id' => $course->ID,
                    'course_title' => $course->post_title,
                    'enrollment_date' => date('Y-m-d H:i:s', strtotime('-' . rand(1, 30) . ' days')),
                    'progress' => rand(0, 100),
                    'status' => rand(0, 100) > 20 ? 'active' : 'completed',
                    'last_activity' => date('Y-m-d H:i:s', strtotime('-' . rand(0, 7) . ' days')),
                    'time_spent' => rand(30, 300) // minutes
                ];
            }
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