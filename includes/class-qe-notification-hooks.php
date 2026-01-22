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
     * Stores previous question data for comparison
     * 
     * @var array
     */
    private $previous_question_data = [];

    /**
     * Stores previous quiz data for comparison
     * 
     * @var array
     */
    private $previous_quiz_data = [];

    /**
     * Stores previous lesson data for comparison
     * 
     * @var array
     */
    private $previous_lesson_data = [];

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

        // Hook into question saves via REST API
        add_action('rest_after_insert_qe_question', [$this, 'handle_question_save'], 20, 3);

        // Hook before question update to capture previous state
        add_action('rest_pre_insert_qe_question', [$this, 'capture_previous_question_state'], 10, 2);

        // Hook into quiz saves via REST API
        add_action('rest_after_insert_qe_quiz', [$this, 'handle_quiz_save'], 20, 3);

        // Hook before quiz update to capture previous state
        add_action('rest_pre_insert_qe_quiz', [$this, 'capture_previous_quiz_state'], 10, 2);

        // Clear debug log on init (keep last 50 entries)
        $this->trim_debug_log();
    }

    /**
     * Log debug message to WordPress option (visible via API)
     * Only logs when WP_DEBUG is enabled to prevent unnecessary DB writes
     */
    private function debug_log($message, $data = [])
    {
        // Only log in debug mode to prevent excessive DB writes
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        // Use static variable to batch writes (only write once per request)
        static $pending_logs = null;
        static $registered_shutdown = false;

        if ($pending_logs === null) {
            $pending_logs = get_option('qe_notification_debug_log', []);
        }

        $pending_logs[] = [
            'time' => current_time('mysql'),
            'message' => $message,
            'data' => $data
        ];

        // Keep only last 50 entries (reduced from 100)
        if (count($pending_logs) > 50) {
            $pending_logs = array_slice($pending_logs, -50);
        }

        // Register shutdown handler to write once per request
        if (!$registered_shutdown) {
            $registered_shutdown = true;
            register_shutdown_function(function () use (&$pending_logs) {
                if (!empty($pending_logs)) {
                    update_option('qe_notification_debug_log', $pending_logs, false); // autoload = false
                }
            });
        }
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

            // Also capture lesson title and content for detecting direct lesson changes
            $lesson = get_post($lesson_id);
            if ($lesson) {
                $this->previous_lesson_data[$lesson_id] = [
                    'title' => $lesson->post_title,
                    'content' => $lesson->post_content,
                ];
            }

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
        // Load API class if not already loaded
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

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

            // Also check if lesson title/content changed (not steps)
            $this->check_for_lesson_content_changes($lesson_id, $course_id, $post_inserted);
        }
    }

    /**
     * Check if lesson title or content has changed (separate from steps)
     *
     * @param int $lesson_id
     * @param int $course_id
     * @param WP_Post $post
     */
    private function check_for_lesson_content_changes($lesson_id, $course_id, $post)
    {
        if (empty($this->previous_lesson_data[$lesson_id])) {
            return;
        }

        $previous = $this->previous_lesson_data[$lesson_id];
        $change_details = [];

        if ($previous['title'] !== $post->post_title) {
            $change_details[] = __('título', 'quiz-extended');
        }

        if ($previous['content'] !== $post->post_content) {
            $change_details[] = __('descripción', 'quiz-extended');
        }

        // If there are changes, notify (but only if no step changes were notified)
        // This prevents duplicate notifications for the same lesson update
        if (!empty($change_details)) {
            $title = __('Lección actualizada', 'quiz-extended');

            $message = sprintf(
                __('Se ha actualizado la lección "%s" (%s).', 'quiz-extended'),
                $post->post_title,
                implode(', ', $change_details)
            );

            $this->debug_log("check_for_lesson_content_changes - creating notification", [
                'lesson_id' => $lesson_id,
                'course_id' => $course_id,
                'changes' => $change_details
            ]);

            QE_Notifications_API::create_notification_record(
                $course_id,
                QE_Notifications_API::TYPE_LESSON_UPDATED,
                $title,
                $message,
                $lesson_id,
                'lesson'
            );
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

    /**
     * Capture previous question state before update
     */
    public function capture_previous_question_state($prepared_post, $request)
    {
        // Only for updates (not new posts)
        if (!empty($request['id'])) {
            $question_id = $request['id'];
            $question = get_post($question_id);

            if ($question) {
                // Capture all relevant question data including meta
                $this->previous_question_data = [
                    'title' => $question->post_title,
                    'content' => $question->post_content,
                    'options' => get_post_meta($question_id, '_question_options', true),
                    'explanation' => get_post_meta($question_id, '_question_explanation', true),
                ];

                $this->debug_log("capture_previous_question_state", [
                    'question_id' => $question_id,
                    'previous_data' => [
                        'title' => $this->previous_question_data['title'],
                        'has_options' => !empty($this->previous_question_data['options']),
                        'has_explanation' => !empty($this->previous_question_data['explanation']),
                    ]
                ]);
            }
        }

        return $prepared_post;
    }

    /**
     * Handle question save - Generate notification when question is updated
     */
    public function handle_question_save($post, $request, $creating)
    {
        global $wpdb;

        // Load API class if not already loaded
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

        // Skip if it's a new question (only notify on updates)
        if ($creating) {
            $this->debug_log("handle_question_save - skipping new question", ['question_id' => $post->ID]);
            return;
        }

        $question_id = $post->ID;

        // Get current meta values for comparison
        $current_options = get_post_meta($question_id, '_question_options', true);
        $current_explanation = get_post_meta($question_id, '_question_explanation', true);

        $this->debug_log("handle_question_save called", [
            'question_id' => $question_id,
            'creating' => $creating,
            'previous_data' => $this->previous_question_data,
            'current_options_count' => is_array($current_options) ? count($current_options) : 0,
            'has_current_explanation' => !empty($current_explanation)
        ]);

        // Check if content actually changed (title, content, options, or explanation)
        $changed = false;
        $change_details = [];

        if (!empty($this->previous_question_data)) {
            // Check title (enunciado)
            if ($this->previous_question_data['title'] !== $post->post_title) {
                $changed = true;
                $change_details[] = __('enunciado', 'quiz-extended');
            }

            // Check content
            if ($this->previous_question_data['content'] !== $post->post_content) {
                $changed = true;
                $change_details[] = __('contenido', 'quiz-extended');
            }

            // Check options (respuestas)
            $previous_options = $this->previous_question_data['options'] ?? [];
            if ($this->options_have_changed($previous_options, $current_options)) {
                $changed = true;
                $change_details[] = __('respuestas', 'quiz-extended');
            }

            // Check explanation
            $previous_explanation = $this->previous_question_data['explanation'] ?? '';
            if ($previous_explanation !== $current_explanation) {
                $changed = true;
                $change_details[] = __('explicación', 'quiz-extended');
            }
        } else {
            // If no previous data, assume it changed (fallback)
            $changed = true;
        }

        if (!$changed) {
            $this->debug_log("handle_question_save - no changes detected", ['question_id' => $question_id]);
            return;
        }

        $this->debug_log("handle_question_save - changes detected", [
            'question_id' => $question_id,
            'change_details' => $change_details
        ]);

        // Find quizzes that contain this question
        // The _quiz_question_ids is stored as a serialized array
        $quiz_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT post_id 
             FROM {$wpdb->postmeta} 
             WHERE meta_key = '_quiz_question_ids' 
             AND (meta_value LIKE %s OR meta_value LIKE %s OR meta_value LIKE %s)",
            '%i:' . intval($question_id) . ';%',  // serialized array with integer
            '%"' . $question_id . '"%',           // serialized array with string
            '%:' . $question_id . ';%'             // alternative serialized format
        ));

        $this->debug_log("handle_question_save - quizzes found", [
            'question_id' => $question_id,
            'quiz_ids' => $quiz_ids
        ]);

        if (empty($quiz_ids)) {
            return;
        }

        // Track which courses have been notified to avoid duplicates
        $notified_courses = [];

        // Get courses from quizzes and create notifications
        foreach ($quiz_ids as $quiz_id) {
            // Try _course_ids first (array), then _course_id (legacy)
            $course_ids = get_post_meta($quiz_id, '_course_ids', true);

            if (empty($course_ids) || !is_array($course_ids)) {
                // Try legacy _course_id
                $course_id = get_post_meta($quiz_id, '_course_id', true);
                $course_ids = $course_id ? [$course_id] : [];
            }

            $this->debug_log("handle_question_save - processing quiz", [
                'quiz_id' => $quiz_id,
                'course_ids' => $course_ids
            ]);

            if (empty($course_ids)) {
                continue;
            }

            // Get quiz title
            $quiz = get_post($quiz_id);
            $quiz_title = $quiz ? $quiz->post_title : 'Quiz';

            foreach ($course_ids as $course_id) {
                $course_id = absint($course_id);

                // Skip if already notified for this course
                if (in_array($course_id, $notified_courses)) {
                    continue;
                }
                $notified_courses[] = $course_id;

                // Create notification with change details
                $title = sprintf(
                    __('Pregunta actualizada en %s', 'quiz-extended'),
                    $quiz_title
                );

                $change_summary = !empty($change_details)
                    ? ' (' . implode(', ', $change_details) . ')'
                    : '';

                $message = sprintf(
                    __('Se ha actualizado la pregunta "%s" en el cuestionario "%s"%s.', 'quiz-extended'),
                    wp_trim_words($post->post_title, 10),
                    $quiz_title,
                    $change_summary
                );

                $this->debug_log("handle_question_save - creating notification", [
                    'course_id' => $course_id,
                    'title' => $title,
                    'change_details' => $change_details
                ]);

                QE_Notifications_API::create_notification_record(
                    $course_id,
                    QE_Notifications_API::TYPE_QUESTION_UPDATED,
                    $title,
                    $message,
                    $question_id,
                    'question'
                );
            }
        }
    }

    /**
     * Compare two arrays of question options to detect changes
     *
     * @param array $previous Previous options array
     * @param array $current Current options array
     * @return bool True if options have changed
     */
    private function options_have_changed($previous, $current)
    {
        // If both are empty or not arrays, no change
        if (empty($previous) && empty($current)) {
            return false;
        }

        // If one is empty and the other is not, there's a change
        if (empty($previous) !== empty($current)) {
            return true;
        }

        // If not arrays, compare directly
        if (!is_array($previous) || !is_array($current)) {
            return $previous !== $current;
        }

        // Compare count first
        if (count($previous) !== count($current)) {
            return true;
        }

        // Compare serialized versions (handles nested arrays)
        return serialize($previous) !== serialize($current);
    }

    /**
     * Capture previous quiz state before update
     */
    public function capture_previous_quiz_state($prepared_post, $request)
    {
        // Only for updates (not new posts)
        if (!empty($request['id'])) {
            $quiz_id = $request['id'];
            $quiz = get_post($quiz_id);

            if ($quiz) {
                $this->previous_quiz_data = [
                    'title' => $quiz->post_title,
                    'content' => $quiz->post_content,
                    'question_ids' => get_post_meta($quiz_id, '_quiz_question_ids', true),
                    'passing_score' => get_post_meta($quiz_id, '_passing_score', true),
                    'time_limit' => get_post_meta($quiz_id, '_time_limit', true),
                ];

                $this->debug_log("capture_previous_quiz_state", [
                    'quiz_id' => $quiz_id,
                    'previous_data' => $this->previous_quiz_data
                ]);
            }
        }

        return $prepared_post;
    }

    /**
     * Handle quiz save - Generate notification when quiz is updated
     */
    public function handle_quiz_save($post, $request, $creating)
    {
        // Load API class if not already loaded
        if (!class_exists('QE_Notifications_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-notifications-api.php';
        }

        // Skip if it's a new quiz (only notify on updates)
        if ($creating) {
            $this->debug_log("handle_quiz_save - skipping new quiz", ['quiz_id' => $post->ID]);
            return;
        }

        $quiz_id = $post->ID;

        $this->debug_log("handle_quiz_save called", [
            'quiz_id' => $quiz_id,
            'creating' => $creating,
            'previous_data' => $this->previous_quiz_data
        ]);

        // Check if content actually changed
        $changed = false;
        $change_details = [];

        if (!empty($this->previous_quiz_data)) {
            if ($this->previous_quiz_data['title'] !== $post->post_title) {
                $changed = true;
                $change_details[] = __('título', 'quiz-extended');
            }
            if ($this->previous_quiz_data['content'] !== $post->post_content) {
                $changed = true;
                $change_details[] = __('instrucciones', 'quiz-extended');
            }

            // Check if questions changed
            $current_question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
            if ($this->previous_quiz_data['question_ids'] !== $current_question_ids) {
                $changed = true;
                $change_details[] = __('preguntas', 'quiz-extended');
            }

            // Check if passing score changed
            $current_passing_score = get_post_meta($quiz_id, '_passing_score', true);
            if ($this->previous_quiz_data['passing_score'] !== $current_passing_score) {
                $changed = true;
                $change_details[] = __('puntuación de aprobación', 'quiz-extended');
            }

            // Check if time limit changed
            $current_time_limit = get_post_meta($quiz_id, '_time_limit', true);
            if ($this->previous_quiz_data['time_limit'] !== $current_time_limit) {
                $changed = true;
                $change_details[] = __('límite de tiempo', 'quiz-extended');
            }
        } else {
            // If no previous data, assume it changed
            $changed = true;
        }

        if (!$changed) {
            $this->debug_log("handle_quiz_save - no changes detected", ['quiz_id' => $quiz_id]);
            return;
        }

        // Get course IDs associated with this quiz
        $course_ids = get_post_meta($quiz_id, '_course_ids', true);

        if (empty($course_ids) || !is_array($course_ids)) {
            // Try legacy _course_id
            $course_id = get_post_meta($quiz_id, '_course_id', true);
            $course_ids = $course_id ? [$course_id] : [];
        }

        $this->debug_log("handle_quiz_save - course_ids found", [
            'quiz_id' => $quiz_id,
            'course_ids' => $course_ids
        ]);

        if (empty($course_ids)) {
            return;
        }

        // Create notification for each course
        foreach ($course_ids as $course_id) {
            $course_id = absint($course_id);

            $title = __('Cuestionario actualizado', 'quiz-extended');

            $change_summary = !empty($change_details)
                ? ' (' . implode(', ', $change_details) . ')'
                : '';

            $message = sprintf(
                __('Se ha actualizado el cuestionario "%s"%s.', 'quiz-extended'),
                $post->post_title,
                $change_summary
            );

            $this->debug_log("handle_quiz_save - creating notification", [
                'course_id' => $course_id,
                'title' => $title
            ]);

            QE_Notifications_API::create_notification_record(
                $course_id,
                QE_Notifications_API::TYPE_QUIZ_UPDATED,
                $title,
                $message,
                $quiz_id,
                'quiz'
            );
        }
    }
}

// Initialize the hooks
QE_Notification_Hooks::instance();
