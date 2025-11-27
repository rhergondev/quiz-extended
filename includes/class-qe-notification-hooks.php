<?php
/**
 * QE_Notification_Hooks Class
 *
 * Hooks into WordPress actions to generate notifications when course content changes.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.0
 * @since      2.0.2
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Notification_Hooks
{
    /**
     * The single instance of the class
     * 
     * @var QE_Notification_Hooks
     */
    private static $instance = null;

    /**
     * Stores previous lesson steps for comparison
     * 
     * @var array
     */
    private $previous_steps = [];

    /**
     * Get single instance
     *
     * @return QE_Notification_Hooks
     */
    public static function instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor - Register all hooks
     */
    private function __construct()
    {
        // Hook into lesson saves via REST API
        add_action('rest_after_insert_qe_lesson', [$this, 'handle_lesson_save'], 20, 3);

        // Hook before update to capture previous state
        add_action('rest_pre_insert_qe_lesson', [$this, 'capture_previous_state'], 10, 2);

        // Optional: Hook into traditional post saves
        add_action('save_post_qe_lesson', [$this, 'handle_traditional_lesson_save'], 20, 3);

        // Clear debug log on init (keep last 50 entries)
        $this->trim_debug_log();
    }

    /**
     * Log debug message to WordPress option (visible via API)
     */
    private function debug_log($message, $data = [])
    {
        $logs = get_option('qe_notification_debug_log', []);
        $logs[] = [
            'time' => current_time('mysql'),
            'message' => $message,
            'data' => $data
        ];
        // Keep only last 100 entries
        if (count($logs) > 100) {
            $logs = array_slice($logs, -100);
        }
        update_option('qe_notification_debug_log', $logs);
    }

    /**
     * Get debug logs (public static method for API access)
     */
    public static function get_debug_logs()
    {
        return get_option('qe_notification_debug_log', []);
    }

    /**
     * Trim debug log to prevent bloat
     */
    private function trim_debug_log()
    {
        $logs = get_option('qe_notification_debug_log', []);
        if (count($logs) > 50) {
            update_option('qe_notification_debug_log', array_slice($logs, -50));
        }
    }

    /**
     * Capture previous lesson state before update
     *
     * @param stdClass $prepared_post Post to be inserted
     * @param WP_REST_Request $request REST request
     */
    public function capture_previous_state($prepared_post, $request)
    {
        $lesson_id = $request->get_param('id');

        $this->debug_log("capture_previous_state called", ['lesson_id' => $lesson_id]);

        if ($lesson_id) {
            $previous_steps = get_post_meta($lesson_id, '_lesson_steps', true);
            $this->previous_steps[$lesson_id] = is_array($previous_steps) ? $previous_steps : [];

            // Log structure of first step to understand the format
            if (!empty($this->previous_steps[$lesson_id])) {
                $first_step = $this->previous_steps[$lesson_id][0];
                $this->debug_log("step structure sample", [
                    'keys' => array_keys($first_step),
                    'first_step' => $first_step
                ]);
            }

            $this->debug_log("captured previous steps", [
                'lesson_id' => $lesson_id,
                'step_count' => count($this->previous_steps[$lesson_id])
            ]);
        }

        return $prepared_post;
    }

    /**
     * Handle lesson save via REST API
     *
     * @param WP_Post $post_inserted The inserted/updated post
     * @param WP_REST_Request $request The REST request
     * @param bool $creating True if creating new post
     */
    public function handle_lesson_save($post_inserted, $request, $creating)
    {
        $lesson_id = $post_inserted->ID;

        $this->debug_log("handle_lesson_save called", [
            'lesson_id' => $lesson_id,
            'creating' => $creating,
            'post_status' => $post_inserted->post_status
        ]);

        // Get course ID
        $course_id = get_post_meta($lesson_id, '_course_id', true);
        if (!$course_id) {
            // Try from request
            $meta = $request->get_param('meta');
            $course_id = $meta['_course_id'] ?? 0;
        }

        $this->debug_log("course_id resolved", ['course_id' => $course_id]);

        if (!$course_id) {
            $this->debug_log("No course_id found, skipping notification");
            return; // No course association, skip notification
        }

        // Only notify for published lessons
        if ($post_inserted->post_status !== 'publish') {
            $this->debug_log("Lesson not published, skipping", ['status' => $post_inserted->post_status]);
            return;
        }

        if ($creating) {
            // New lesson created
            $this->debug_log("Creating notification for new lesson");
            $this->notify_new_lesson($lesson_id, $course_id);
        } else {
            // Lesson updated - check for new steps
            $this->debug_log("Checking for new steps in updated lesson");
            $this->check_for_new_steps($lesson_id, $course_id);
        }
    }

    /**
     * Handle traditional lesson save (via admin panel)
     *
     * @param int $post_id Post ID
     * @param WP_Post $post Post object
     * @param bool $update True if updating
     */
    public function handle_traditional_lesson_save($post_id, $post, $update)
    {
        // Skip autosaves and revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($post_id)) {
            return;
        }

        // Only for published lessons
        if ($post->post_status !== 'publish') {
            return;
        }

        $course_id = get_post_meta($post_id, '_course_id', true);
        if (!$course_id) {
            return;
        }

        // For new posts, create notification
        if (!$update) {
            $this->notify_new_lesson($post_id, $course_id);
        }
    }

    /**
     * Check for new steps in an updated lesson
     *
     * @param int $lesson_id
     * @param int $course_id
     */
    private function check_for_new_steps($lesson_id, $course_id)
    {
        $current_steps = get_post_meta($lesson_id, '_lesson_steps', true);
        $current_steps = is_array($current_steps) ? $current_steps : [];

        $previous_steps = $this->previous_steps[$lesson_id] ?? [];

        $current_count = count($current_steps);
        $previous_count = count($previous_steps);

        // Build hash maps for comparison (using type + title as key)
        $previous_hashes = [];
        foreach ($previous_steps as $step) {
            $key = ($step['type'] ?? '') . '::' . ($step['title'] ?? '');
            $previous_hashes[$key] = $this->get_step_content_hash($step);
        }

        $current_hashes = [];
        foreach ($current_steps as $step) {
            $key = ($step['type'] ?? '') . '::' . ($step['title'] ?? '');
            $current_hashes[$key] = $this->get_step_content_hash($step);
        }

        // 1. Check for NEW steps (keys that didn't exist before)
        $new_steps = [];
        foreach ($current_steps as $step) {
            $key = ($step['type'] ?? '') . '::' . ($step['title'] ?? '');
            if (!isset($previous_hashes[$key])) {
                $new_steps[] = $step;
            }
        }

        // Notify for each new step
        foreach ($new_steps as $step) {
            $this->notify_new_step($lesson_id, $course_id, $step);
        }

        // 2. Check for MODIFIED steps (same key but different content hash)
        $modified_steps = [];
        foreach ($current_steps as $step) {
            $key = ($step['type'] ?? '') . '::' . ($step['title'] ?? '');
            // Only check if it existed before (not a new step)
            if (isset($previous_hashes[$key]) && $previous_hashes[$key] !== $current_hashes[$key]) {
                $modified_steps[] = $step;
            }
        }

        // Notify for each modified step
        foreach ($modified_steps as $step) {
            $this->notify_modified_step($lesson_id, $course_id, $step);
        }
    }

    /**
     * Generate a hash of the step content for comparison
     *
     * @param array $step
     * @return string
     */
    private function get_step_content_hash($step)
    {
        $data = $step['data'] ?? [];
        // Serialize the data array to get a consistent string
        return md5(serialize($data));
    }

    /**
     * Create notification for modified step in a lesson
     *
     * @param int $lesson_id
     * @param int $course_id
     * @param array $step
     */
    private function notify_modified_step($lesson_id, $course_id, $step)
    {
        // Load API class if not already loaded
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

        $lesson = get_post($lesson_id);
        if (!$lesson) {
            return;
        }

        $step_type = $step['type'] ?? 'text';
        $step_title = $step['title'] ?? '';

        // Configuration per step type
        $type_config = [
            'quiz' => ['label' => __('cuestionario', 'quiz-extended')],
            'video' => ['label' => __('video', 'quiz-extended')],
            'pdf' => ['label' => __('documento PDF', 'quiz-extended')],
            'text' => ['label' => __('contenido de texto', 'quiz-extended')],
        ];

        $config = $type_config[$step_type] ?? ['label' => __('contenido', 'quiz-extended')];

        $title = __('Contenido actualizado', 'quiz-extended');

        if (!empty($step_title)) {
            $message = sprintf(
                __('Se ha actualizado el %s: "%s" en la lección "%s".', 'quiz-extended'),
                $config['label'],
                $step_title,
                $lesson->post_title
            );
        } else {
            $message = sprintf(
                __('Se ha actualizado el %s en la lección "%s".', 'quiz-extended'),
                $config['label'],
                $lesson->post_title
            );
        }

        QE_Notifications_API::create_notification_record(
            $course_id,
            'lesson_updated',
            $title,
            $message,
            $lesson_id,
            'lesson'
        );
    }

    /**
     * Create notification for new lesson
     *
     * @param int $lesson_id
     * @param int $course_id
     */
    private function notify_new_lesson($lesson_id, $course_id)
    {
        // Load API class if not already loaded
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

        $lesson = get_post($lesson_id);
        if (!$lesson)
            return;

        $title = __('Nueva lección disponible', 'quiz-extended');
        $message = sprintf(
            __('Se ha añadido una nueva lección: "%s".', 'quiz-extended'),
            $lesson->post_title
        );

        QE_Notifications_API::create_notification_record(
            $course_id,
            QE_Notifications_API::TYPE_NEW_LESSON,
            $title,
            $message,
            $lesson_id,
            'lesson'
        );
    }

    /**
     * Create notification for new step in a lesson
     *
     * @param int $lesson_id
     * @param int $course_id
     * @param array $step Step data
     */
    private function notify_new_step($lesson_id, $course_id, $step)
    {
        // Load API class if not already loaded
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

        $lesson = get_post($lesson_id);
        if (!$lesson)
            return;

        $step_type = $step['type'] ?? 'text';
        $step_title = $step['title'] ?? '';

        // Map step type to notification type and label
        $type_config = [
            'quiz' => [
                'type' => QE_Notifications_API::TYPE_NEW_QUIZ,
                'label' => __('cuestionario', 'quiz-extended'),
                'label_un' => __('un nuevo cuestionario', 'quiz-extended')
            ],
            'video' => [
                'type' => QE_Notifications_API::TYPE_NEW_VIDEO,
                'label' => __('video', 'quiz-extended'),
                'label_un' => __('un nuevo video', 'quiz-extended')
            ],
            'pdf' => [
                'type' => QE_Notifications_API::TYPE_NEW_PDF,
                'label' => __('documento PDF', 'quiz-extended'),
                'label_un' => __('un nuevo documento PDF', 'quiz-extended')
            ],
            'text' => [
                'type' => QE_Notifications_API::TYPE_NEW_TEXT,
                'label' => __('contenido', 'quiz-extended'),
                'label_un' => __('nuevo contenido', 'quiz-extended')
            ]
        ];

        $config = $type_config[$step_type] ?? $type_config['text'];

        $title = sprintf(__('Nuevo %s añadido', 'quiz-extended'), $config['label']);

        if ($step_title) {
            $message = sprintf(
                __('Se ha añadido %s: "%s" en la lección "%s".', 'quiz-extended'),
                $config['label_un'],
                $step_title,
                $lesson->post_title
            );
        } else {
            $message = sprintf(
                __('Se ha añadido %s en la lección "%s".', 'quiz-extended'),
                $config['label_un'],
                $lesson->post_title
            );
        }

        QE_Notifications_API::create_notification_record(
            $course_id,
            $config['type'],
            $title,
            $message,
            $lesson_id,
            'lesson'
        );
    }
}

// Initialize the hooks
QE_Notification_Hooks::instance();
