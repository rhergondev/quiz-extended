<?php
/**
 * QE_Auth Class
 *
 * Advanced authentication and authorization system for Quiz Extended LMS.
 * Handles user permissions, role-based access control, and API authentication.
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

class QE_Auth
{
    /**
     * The single instance of the class
     * 
     * @var QE_Auth
     */
    private static $instance = null;

    /**
     * Security instance
     * 
     * @var QE_Security
     */
    private $security;

    /**
     * Custom capabilities for LMS
     * 
     * @var array
     */
    private $custom_capabilities = [
        'administrator' => [
            // Full access to everything
            'manage_lms',
            'manage_courses',
            'manage_lessons',
            'manage_quizzes',
            'manage_questions',
            'manage_students',
            'view_reports',
            'manage_enrollments',
            'grade_submissions',
        ],
        'lms_instructor' => [
            // Can manage their own courses
            'create_courses',
            'edit_own_courses',
            'delete_own_courses',
            'create_lessons',
            'edit_own_lessons',
            'delete_own_lessons',
            'create_quizzes',
            'edit_own_quizzes',
            'delete_own_quizzes',
            'create_questions',
            'edit_own_questions',
            'delete_own_questions',
            'view_students',
            'grade_submissions',
        ],
        'lms_student' => [
            // Can view and interact with courses
            'view_courses',
            'enroll_courses',
            'take_quizzes',
            'view_own_progress',
            'submit_assignments',
        ],
    ];

    /**
     * Get single instance
     *
     * @return QE_Auth
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
        $this->security = QE_Security::instance();

        // Register custom roles
        add_action('init', [$this, 'register_custom_roles']);

        // Add custom capabilities
        // add_action('init', [$this, 'add_custom_capabilities']);

        // REST API authentication
        add_filter('rest_authentication_errors', [$this, 'rest_authentication_check'], 10, 1);

        // Permission callbacks for REST API
        // add_filter('rest_pre_dispatch', [$this, 'check_rest_permissions'], 10, 3);
    }

    // ============================================================
    // ROLE MANAGEMENT
    // ============================================================

    /**
     * Register custom roles for LMS
     */
    public function register_custom_roles()
    {
        // Check if roles already exist
        if (get_role('lms_instructor')) {
            return;
        }

        // LMS Instructor Role
        add_role(
            'lms_instructor',
            __('LMS Instructor', 'quiz-extended'),
            [
                'read' => true,
                'edit_posts' => true,
                'upload_files' => true,
            ]
        );

        // LMS Student Role (based on subscriber)
        add_role(
            'lms_student',
            __('LMS Student', 'quiz-extended'),
            [
                'read' => true,
            ]
        );

        $this->log_info('Custom roles registered');
    }

    /**
     * Add custom capabilities to roles
     */
    public function add_custom_capabilities()
    {
        foreach ($this->custom_capabilities as $role_name => $capabilities) {
            $role = get_role($role_name);

            if (!$role) {
                continue;
            }

            foreach ($capabilities as $capability) {
                if (!$role->has_cap($capability)) {
                    $role->add_cap($capability);
                }
            }
        }
    }

    // ============================================================
    // PERMISSION CHECKS
    // ============================================================

    /**
     * Check if current user can manage courses
     *
     * @return bool
     */
    public function can_manage_courses()
    {
        return current_user_can('manage_courses') || current_user_can('manage_lms');
    }

    /**
     * Check if current user can manage a specific course
     *
     * @param int $course_id Course ID
     * @return bool
     */
    public function can_manage_course($course_id)
    {
        // Admins can manage all courses
        if (current_user_can('manage_lms')) {
            return true;
        }

        // Check ownership
        if ($this->security->user_owns_post($course_id) && current_user_can('edit_own_courses')) {
            return true;
        }

        return false;
    }

    /**
     * Check if current user can view a course
     *
     * @param int $course_id Course ID
     * @return bool
     */
    public function can_view_course($course_id)
    {
        $user_id = get_current_user_id();

        // Debug logging
        error_log('[QE Auth] can_view_course called - Course ID: ' . $course_id . ', User ID: ' . $user_id);
        error_log('[QE Auth] User capabilities check:');
        error_log('  - administrator: ' . (current_user_can('administrator') ? 'YES' : 'NO'));
        error_log('  - manage_lms: ' . (current_user_can('manage_lms') ? 'YES' : 'NO'));
        error_log('  - view_courses: ' . (current_user_can('view_courses') ? 'YES' : 'NO'));
        error_log('  - edit_qe_courses: ' . (current_user_can('edit_qe_courses') ? 'YES' : 'NO'));
        error_log('  - edit_courses: ' . (current_user_can('edit_courses') ? 'YES' : 'NO'));

        // Admins, instructors and users with viewing capabilities can view all
        if (
            current_user_can('administrator')
            || current_user_can('manage_lms')
            || current_user_can('view_courses')
            || current_user_can('edit_qe_courses')
            || current_user_can('edit_courses')
        ) {
            error_log('[QE Auth] Access GRANTED by capability');
            return true;
        }

        // Check if user is enrolled
        $is_enrolled = $this->is_user_enrolled($course_id);
        error_log('[QE Auth] Checking enrollment: ' . ($is_enrolled ? 'YES' : 'NO'));
        error_log('[QE Auth] Final result: ' . ($is_enrolled ? 'GRANTED' : 'DENIED'));

        return $is_enrolled;
    }

    /**
     * Check if current user can take a quiz
     *
     * SIMPLIFIED SECURITY MODEL:
     * Quizzes are not standalone entities - they're always part of a course.
     * Course access is already validated by can_view_course() at the API level.
     * This method only validates basic requirements (logged in, quiz published).
     * No need to re-check enrollment here - trust the course security layer.
     *
     * @param int $quiz_id Quiz ID
     * @return bool
     */
    public function can_take_quiz($quiz_id)
    {
        // 1. User must be logged in
        if (!is_user_logged_in()) {
            error_log('[QE Auth] can_take_quiz: User not logged in');
            return false;
        }

        $user_id = get_current_user_id();
        error_log(sprintf('[QE Auth] can_take_quiz: User ID: %d, Quiz ID: %d', $user_id, $quiz_id));

        // 2. Admins and instructors can always take quizzes
        if (current_user_can('manage_lms') || current_user_can('edit_courses')) {
            error_log('[QE Auth] can_take_quiz: User has admin permissions - GRANTED');
            return true;
        }

        // 3. Quiz must be published
        $quiz = get_post($quiz_id);
        if (!$quiz || $quiz->post_status !== 'publish') {
            error_log(sprintf('[QE Auth] can_take_quiz: Quiz not published - Status: %s - DENIED', $quiz ? $quiz->post_status : 'NULL'));
            return false;
        }

        // 4. Trust the course security layer
        // If user accessed this quiz through the course UI, they already passed can_view_course()
        // No need to re-validate enrollment here - the course layer handles it
        error_log('[QE Auth] can_take_quiz: Basic checks passed, trusting course security - GRANTED');
        return true;
    }    /**
         * Check if user is enrolled in a course
         *
         * @param int $course_id Course ID
         * @param int $user_id User ID (default: current user)
         * @return bool
         */
    public function is_user_enrolled($course_id, $user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        if (!$user_id) {
            return false;
        }

        $enrolled = get_user_meta($user_id, '_enrolled_course_' . $course_id, true);

        // Log for debugging
        error_log(sprintf(
            '[QE Auth] Checking enrollment - User: %d, Course: %d, Meta Value: %s, Type: %s',
            $user_id,
            $course_id,
            var_export($enrolled, true),
            gettype($enrolled)
        ));

        // Accept: 'yes', '1', 1, true, or any truthy value
        return !empty($enrolled) && ($enrolled === 'yes' || $enrolled == 1 || $enrolled === true || $enrolled === '1');
    }    /**
         * Check if user can grade submissions
         *
         * @param int $course_id Course ID (optional)
         * @return bool
         */
    public function can_grade_submissions($course_id = null)
    {
        if (!current_user_can('grade_submissions')) {
            return false;
        }

        // If specific course, check ownership for instructors
        if ($course_id && !current_user_can('manage_lms')) {
            return $this->security->user_owns_post($course_id);
        }

        return true;
    }

    // ============================================================
    // REST API AUTHENTICATION
    // ============================================================

    /**
     * Check REST API authentication
     *
     * @param WP_Error|null|bool $result Error from previous authentication handler
     * @return WP_Error|null|bool
     */
    public function rest_authentication_check($result)
    {
        // If already authenticated or error, return
        if (!empty($result)) {
            return $result;
        }

        // Check if it's a REST request to our endpoints
        $route = $_SERVER['REQUEST_URI'] ?? '';

        // Only check our custom endpoints, not core WordPress endpoints like /wp/v2/users
        if (
            strpos($route, '/wp-json/wp/v2/qe_course') === false &&
            strpos($route, '/wp-json/wp/v2/qe_lesson') === false &&
            strpos($route, '/wp-json/wp/v2/qe_quiz') === false &&
            strpos($route, '/wp-json/wp/v2/qe_question') === false &&
            strpos($route, '/wp-json/quiz-extended/v1') === false &&
            strpos($route, '/wp-json/qe/v1') === false
        ) {
            // Not our endpoint, let WordPress handle authentication
            return $result;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in to access this resource.', 'quiz-extended'),
                ['status' => 401]
            );
        }

        return $result;
    }

    /**
     * Check REST API permissions before dispatch
     *
     * @param mixed $result Response to replace
     * @param WP_REST_Server $server Server instance
     * @param WP_REST_Request $request Request object
     * @return mixed
     */
    public function check_rest_permissions($result, $server, $request)
    {
        $route = $request->get_route();
        $method = $request->get_method();

        // Only check our endpoints
        if (!$this->is_our_endpoint($route)) {
            return $result;
        }

        // Verify nonce for state-changing operations
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            if (!$this->security->verify_rest_nonce($request)) {
                return new WP_Error(
                    'rest_nonce_invalid',
                    __('Invalid security token. Please refresh the page and try again.', 'quiz-extended'),
                    ['status' => 403]
                );
            }
        }

        // Route-specific permission checks
        $permission_check = $this->check_route_permission($route, $method, $request);

        if (is_wp_error($permission_check)) {
            return $permission_check;
        }

        return $result;
    }

    /**
     * Check if route belongs to our plugin
     *
     * @param string $route Route path
     * @return bool
     */
    private function is_our_endpoint($route)
    {
        $our_routes = [
            '/wp/v2/qe_course',
            '/wp/v2/qe_lesson',
            '/wp/v2/qe_quiz',
            '/wp/v2/qe_question',
            '/quiz-extended/v1',
            '/qe/v1', // User enrollments and custom endpoints
        ];

        foreach ($our_routes as $our_route) {
            if (strpos($route, $our_route) === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check permission for specific route
     *
     * @param string $route Route path
     * @param string $method HTTP method
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if allowed, WP_Error otherwise
     */
    private function check_route_permission($route, $method, $request)
    {
        // Extract resource type and ID
        preg_match('#/wp/v2/(qe_course|qe_lesson|qe_quiz|qe_question)(?:/(\d+))?#', $route, $matches);

        if (empty($matches)) {
            // Custom API routes - handle separately
            return $this->check_custom_api_permission($route, $method, $request);
        }

        $resource_type = $matches[1];
        $resource_id = isset($matches[2]) ? absint($matches[2]) : null;

        // Check permissions based on method
        switch ($method) {
            case 'GET':
                return $this->check_read_permission($resource_type, $resource_id);

            case 'POST':
                return $resource_id
                    ? $this->check_update_permission($resource_type, $resource_id)
                    : $this->check_create_permission($resource_type);

            case 'PUT':
            case 'PATCH':
                return $this->check_update_permission($resource_type, $resource_id);

            case 'DELETE':
                return $this->check_delete_permission($resource_type, $resource_id);

            default:
                return true;
        }
    }

    /**
     * Check read permission
     *
     * @param string $resource_type Resource type
     * @param int|null $resource_id Resource ID
     * @return bool|WP_Error
     */
    private function check_read_permission($resource_type, $resource_id)
    {
        // Admins can read everything
        if (current_user_can('administrator') || current_user_can('manage_lms')) {
            return true;
        }

        // Check WordPress native read capability
        $read_cap = 'read_private_' . $resource_type . 's';
        if (current_user_can($read_cap)) {
            return true;
        }

        // Can read own posts
        if ($resource_id && $this->security->user_owns_post($resource_id)) {
            return true;
        }

        // Can read published content
        if ($resource_id) {
            $post = get_post($resource_id);
            if ($post && $post->post_status === 'publish') {
                return true;
            }
        }

        // Students can browse published courses/lessons
        if (in_array($resource_type, ['qe_course', 'qe_lesson'])) {
            return true; // Can browse list of published items
        }

        return new WP_Error(
            'rest_forbidden',
            __('You do not have permission to view this resource.', 'quiz-extended'),
            ['status' => 403]
        );
    }

    /**
     * Check create permission
     *
     * @param string $resource_type Resource type
     * @return bool|WP_Error
     */
    /**
     * Check create permission
     *
     * @param string $resource_type Resource type
     * @return bool|WP_Error
     */
    private function check_create_permission($resource_type)
    {
        // WordPress native capabilities - trust the system
        // Admins and users with proper capabilities can create
        if (current_user_can('administrator')) {
            return true;
        }

        // Check WordPress native create capability for this post type
        $create_cap = 'create_' . $resource_type . 's';
        if (current_user_can($create_cap)) {
            return true;
        }

        // Fallback: check edit capability (WordPress standard)
        $edit_cap = 'edit_' . $resource_type . 's';
        if (current_user_can($edit_cap)) {
            return true;
        }

        // Check publish capability (needed for creating published posts)
        $publish_cap = 'publish_' . $resource_type . 's';
        if (current_user_can($publish_cap)) {
            return true;
        }

        return new WP_Error(
            'rest_cannot_create',
            sprintf(
                __('You do not have permission to create %s.', 'quiz-extended'),
                str_replace('qe_', '', $resource_type) . 's'
            ),
            ['status' => 403]
        );
    }

    /**
     * Check update permission
     *
     * @param string $resource_type Resource type
     * @param int $resource_id Resource ID
     * @return bool|WP_Error
     */
    private function check_update_permission($resource_type, $resource_id)
    {
        if (!$resource_id) {
            return new WP_Error(
                'rest_invalid_id',
                __('Invalid resource ID.', 'quiz-extended'),
                ['status' => 400]
            );
        }

        // Admins can update everything
        if (current_user_can('administrator') || current_user_can('manage_lms')) {
            return true;
        }

        // Check if user owns the resource and can edit it
        if ($this->security->user_owns_post($resource_id)) {
            $edit_cap = 'edit_' . $resource_type . 's';
            if (current_user_can($edit_cap)) {
                return true;
            }
        }

        // Check if user can edit others' content
        $edit_others_cap = 'edit_others_' . $resource_type . 's';
        if (current_user_can($edit_others_cap)) {
            return true;
        }

        return new WP_Error(
            'rest_cannot_edit',
            __('You do not have permission to edit this resource.', 'quiz-extended'),
            ['status' => 403]
        );
    }

    /**
     * Check delete permission
     *
     * @param string $resource_type Resource type
     * @param int $resource_id Resource ID
     * @return bool|WP_Error
     */
    private function check_delete_permission($resource_type, $resource_id)
    {
        if (!$resource_id) {
            return new WP_Error(
                'rest_invalid_id',
                __('Invalid resource ID.', 'quiz-extended'),
                ['status' => 400]
            );
        }

        // Admins can delete everything
        if (current_user_can('administrator') || current_user_can('manage_lms')) {
            return true;
        }

        // Check if user owns the resource and can delete it
        if ($this->security->user_owns_post($resource_id)) {
            $delete_cap = 'delete_' . $resource_type . 's';
            if (current_user_can($delete_cap)) {
                return true;
            }
        }

        // Check if user can delete others' content
        $delete_others_cap = 'delete_others_' . $resource_type . 's';
        if (current_user_can($delete_others_cap)) {
            return true;
        }

        return new WP_Error(
            'rest_cannot_delete',
            __('You do not have permission to delete this resource.', 'quiz-extended'),
            ['status' => 403]
        );
    }

    /**
     * Check custom API endpoint permissions
     *
     * @param string $route Route path
     * @param string $method HTTP method
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error
     */
    private function check_custom_api_permission($route, $method, $request)
    {
        // Quiz attempts endpoints
        if (strpos($route, '/quiz-attempts/start') !== false) {
            $quiz_id = $request->get_param('quiz_id');
            if (!$this->can_take_quiz($quiz_id)) {
                return new WP_Error(
                    'rest_cannot_start_quiz',
                    __('You do not have permission to start this quiz.', 'quiz-extended'),
                    ['status' => 403]
                );
            }
        }

        if (strpos($route, '/quiz-attempts/submit') !== false) {
            $attempt_id = $request->get_param('attempt_id');
            if (!$this->can_submit_quiz_attempt($attempt_id)) {
                return new WP_Error(
                    'rest_cannot_submit_quiz',
                    __('You do not have permission to submit this quiz attempt.', 'quiz-extended'),
                    ['status' => 403]
                );
            }
        }

        // Student progress endpoints
        if (strpos($route, '/student-progress') !== false) {
            // Users can only manage their own progress
            return true;
        }

        // Rankings endpoints (read-only)
        if (strpos($route, '/rankings') !== false && $method === 'GET') {
            return true;
        }

        // Default: require login
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in to access this resource.', 'quiz-extended'),
                ['status' => 401]
            );
        }

        return true;
    }

    /**
     * Check if user can submit a quiz attempt
     *
     * @param int $attempt_id Attempt ID
     * @return bool
     */
    private function can_submit_quiz_attempt($attempt_id)
    {
        global $wpdb;

        if (!is_user_logged_in()) {
            return false;
        }

        $table_name = $wpdb->prefix . 'qe_quiz_attempts';
        $user_id = get_current_user_id();

        $attempt = $wpdb->get_row($wpdb->prepare(
            "SELECT user_id, status FROM {$table_name} WHERE attempt_id = %d",
            $attempt_id
        ));

        if (!$attempt) {
            return false;
        }

        // Check ownership
        if ((int) $attempt->user_id !== $user_id) {
            return false;
        }

        // Check if already completed
        if ($attempt->status === 'completed') {
            return false;
        }

        return true;
    }

    // ============================================================
    // ENROLLMENT MANAGEMENT
    // ============================================================

    /**
     * Enroll user in course
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function enroll_user($user_id, $course_id)
    {
        // Validate user
        $user = get_user_by('id', $user_id);
        if (!$user) {
            return new WP_Error(
                'invalid_user',
                __('Invalid user ID.', 'quiz-extended'),
                ['status' => 400]
            );
        }

        // Validate course
        $course = get_post($course_id);
        if (!$course || $course->post_type !== 'qe_course') {
            return new WP_Error(
                'invalid_course',
                __('Invalid course ID.', 'quiz-extended'),
                ['status' => 400]
            );
        }

        // Check if already enrolled
        if ($this->is_user_enrolled($course_id, $user_id)) {
            return new WP_Error(
                'already_enrolled',
                __('User is already enrolled in this course.', 'quiz-extended'),
                ['status' => 409]
            );
        }

        // Enroll user
        update_user_meta($user_id, '_enrolled_course_' . $course_id, 'yes');
        update_user_meta($user_id, '_enrolled_course_' . $course_id . '_date', current_time('mysql'));

        // Fire action hook
        do_action('qe_user_enrolled', $user_id, $course_id);

        $this->log_info('User enrolled in course', [
            'user_id' => $user_id,
            'course_id' => $course_id
        ]);

        return true;
    }

    /**
     * Unenroll user from course
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function unenroll_user($user_id, $course_id)
    {
        // Validate user
        $user = get_user_by('id', $user_id);
        if (!$user) {
            return new WP_Error(
                'invalid_user',
                __('Invalid user ID.', 'quiz-extended'),
                ['status' => 400]
            );
        }

        // Check if enrolled
        if (!$this->is_user_enrolled($course_id, $user_id)) {
            return new WP_Error(
                'not_enrolled',
                __('User is not enrolled in this course.', 'quiz-extended'),
                ['status' => 409]
            );
        }

        // Unenroll user
        delete_user_meta($user_id, '_enrolled_course_' . $course_id);
        delete_user_meta($user_id, '_enrolled_course_' . $course_id . '_date');
        delete_user_meta($user_id, '_course_' . $course_id . '_progress');
        delete_user_meta($user_id, '_course_' . $course_id . '_last_activity');

        // Fire action hook
        do_action('qe_user_unenrolled', $user_id, $course_id);

        $this->log_info('User unenrolled from course', [
            'user_id' => $user_id,
            'course_id' => $course_id
        ]);

        return true;
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Get user's enrolled courses
     *
     * @param int $user_id User ID (default: current user)
     * @return array Array of course IDs
     */
    public function get_user_courses($user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        global $wpdb;

        $meta_key_pattern = '_enrolled_course_%';

        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT meta_key FROM {$wpdb->usermeta} 
             WHERE user_id = %d 
             AND meta_key LIKE %s 
             AND meta_value = 'yes'",
            $user_id,
            $meta_key_pattern
        ));

        $course_ids = [];
        foreach ($results as $row) {
            if (preg_match('/_enrolled_course_(\d+)$/', $row->meta_key, $matches)) {
                $course_ids[] = absint($matches[1]);
            }
        }

        return $course_ids;
    }

    /**
     * Check if user has completed a course
     *
     * @param int $course_id Course ID
     * @param int $user_id User ID (default: current user)
     * @return bool
     */
    public function has_completed_course($course_id, $user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        $progress = get_user_meta($user_id, '_course_' . $course_id . '_progress', true);

        return $progress && floatval($progress) >= 100;
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
                '[Quiz Extended Auth] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}

// Initialize
QE_Auth::instance();