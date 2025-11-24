<?php
/**
 * QE_Quiz_Course_Sync Class
 *
 * Synchronizes quiz _course_ids when lessons are saved
 * Maintains the relationship between quizzes and courses via lessons
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Quiz_Course_Sync
{
    /**
     * Initialize the sync hooks
     */
    public function __construct()
    {
        // Hook into lesson save to update quiz course associations
        add_action('save_post_qe_lesson', [$this, 'sync_quiz_courses_on_lesson_save'], 20, 3);

        // Hook into quiz save to sync from lesson_ids
        add_action('save_post_qe_quiz', [$this, 'sync_quiz_courses_on_quiz_save'], 20, 3);
    }

    /**
     * Sync quiz course_ids when a lesson is saved
     * 
     * @param int $lesson_id The lesson post ID
     * @param WP_Post $post The lesson post object
     * @param bool $update Whether this is an update or a new post
     */
    public function sync_quiz_courses_on_lesson_save($lesson_id, $post, $update)
    {
        // Skip autosaves and revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($lesson_id)) {
            return;
        }

        // Get the course_id for this lesson
        $course_id = get_post_meta($lesson_id, '_course_id', true);

        if (empty($course_id)) {
            return; // No course associated with this lesson
        }

        // Get the lesson steps to find quizzes
        $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);

        if (empty($lesson_steps) || !is_array($lesson_steps)) {
            return; // No steps in this lesson
        }

        // Find all quiz IDs in the lesson steps
        $quiz_ids = [];
        foreach ($lesson_steps as $step) {
            if (isset($step['type']) && $step['type'] === 'quiz' && !empty($step['data']['quiz_id'])) {
                $quiz_ids[] = absint($step['data']['quiz_id']);
            }
        }

        // Update each quiz's course_ids
        foreach ($quiz_ids as $quiz_id) {
            $this->add_course_to_quiz($quiz_id, $course_id);
            // Update lesson_id
            update_post_meta($quiz_id, '_lesson_id', $lesson_id);
        }
    }

    /**
     * Sync quiz course_ids when a quiz is saved
     * Rebuilds course_ids from all lessons that contain this quiz
     * 
     * @param int $quiz_id The quiz post ID
     * @param WP_Post $post The quiz post object
     * @param bool $update Whether this is an update or a new post
     */
    public function sync_quiz_courses_on_quiz_save($quiz_id, $post, $update)
    {
        // Skip autosaves and revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($quiz_id)) {
            return;
        }

        // Rebuild course_ids from scratch by finding all lessons that contain this quiz
        $this->rebuild_quiz_course_ids($quiz_id);

        // Sync questions to ensure they inherit course/lesson relationships
        $this->sync_questions_on_quiz_save($quiz_id);
    }

    /**
     * Add a course to a quiz's _course_ids array
     * 
     * @param int $quiz_id The quiz ID
     * @param int $course_id The course ID to add
     */
    private function add_course_to_quiz($quiz_id, $course_id)
    {
        $course_ids = get_post_meta($quiz_id, '_course_ids', true);

        if (!is_array($course_ids)) {
            $course_ids = [];
        }

        $course_id = absint($course_id);

        if (!in_array($course_id, $course_ids)) {
            $course_ids[] = $course_id;
            $course_ids = array_values(array_unique(array_filter($course_ids)));
            update_post_meta($quiz_id, '_course_ids', $course_ids);
        }
    }

    /**
     * Rebuild a quiz's _course_ids from all lessons that contain it
     * 
     * @param int $quiz_id The quiz ID
     */
    private function rebuild_quiz_course_ids($quiz_id)
    {
        global $wpdb;

        // Find all lessons that contain this quiz in their steps
        // Try multiple patterns to match different JSON formats AND Serialized PHP formats
        $patterns = [
            // JSON formats
            '%"quiz_id":"' . $quiz_id . '"%',   // String format
            '%"quiz_id":' . $quiz_id . ',%',    // Number format with comma
            '%"quiz_id":' . $quiz_id . '}%',    // Number format at end
            '%"quiz_id": ' . $quiz_id . '%',    // With space

            // Serialized PHP formats (standard WP meta)
            '%s:7:"quiz_id";i:' . $quiz_id . ';%',      // Integer: s:7:"quiz_id";i:844;
            '%s:7:"quiz_id";s:%:"' . $quiz_id . '";%',  // String: s:7:"quiz_id";s:3:"844";
        ];

        $lesson_ids = [];
        foreach ($patterns as $pattern) {
            $results = $wpdb->get_results($wpdb->prepare(
                "SELECT DISTINCT post_id 
                 FROM {$wpdb->postmeta} 
                 WHERE meta_key = '_lesson_steps' 
                 AND meta_value LIKE %s",
                $pattern
            ));

            foreach ($results as $result) {
                $lesson_ids[] = $result->post_id;
            }
        }

        // Remove duplicates
        $lesson_ids = array_unique($lesson_ids);

        // Update _lesson_id (take the first one found)
        if (!empty($lesson_ids)) {
            // Assuming the first lesson found is the primary one
            $primary_lesson_id = reset($lesson_ids);
            update_post_meta($quiz_id, '_lesson_id', $primary_lesson_id);
        }

        $course_ids = [];

        foreach ($lesson_ids as $lesson_id) {
            $course_id = get_post_meta($lesson_id, '_course_id', true);
            if (!empty($course_id)) {
                $course_ids[] = absint($course_id);
            }
        }

        // Remove duplicates and save
        $course_ids = array_values(array_unique(array_filter($course_ids)));

        // Log for debugging
        error_log("REBUILD_QUIZ_COURSE_IDS - Quiz ID: $quiz_id, Found courses: " . implode(',', $course_ids));

        update_post_meta($quiz_id, '_course_ids', $course_ids);
    }

    /**
     * Sync questions when a quiz is saved
     * Ensures all questions in the quiz have the correct course and lesson associations
     * 
     * @param int $quiz_id The quiz post ID
     */
    private function sync_questions_on_quiz_save($quiz_id)
    {
        $questions = get_post_meta($quiz_id, '_quiz_question_ids', true);
        if (empty($questions) || !is_array($questions)) {
            return;
        }

        $quiz_courses = get_post_meta($quiz_id, '_course_ids', true);
        $quiz_lessons = get_post_meta($quiz_id, '_lesson_ids', true);

        if (!is_array($quiz_courses))
            $quiz_courses = [];
        if (!is_array($quiz_lessons))
            $quiz_lessons = [];

        // Fallback for legacy
        if (empty($quiz_courses)) {
            $legacy_course = get_post_meta($quiz_id, '_course_id', true);
            if ($legacy_course)
                $quiz_courses[] = $legacy_course;
        }

        foreach ($questions as $question_id) {
            $this->add_relationships_to_question($question_id, $quiz_courses, $quiz_lessons);
        }
    }

    /**
     * Add course and lesson relationships to a question
     * 
     * @param int $question_id
     * @param array $course_ids
     * @param array $lesson_ids
     */
    private function add_relationships_to_question($question_id, $course_ids, $lesson_ids)
    {
        // Update Courses
        if (!empty($course_ids)) {
            $current_courses = get_post_meta($question_id, '_course_ids', true);
            if (!is_array($current_courses))
                $current_courses = [];

            $new_courses = array_unique(array_merge($current_courses, $course_ids));
            $new_courses = array_map('absint', $new_courses);
            sort($new_courses);

            $current_courses = array_map('absint', $current_courses);
            sort($current_courses);

            if ($new_courses !== $current_courses) {
                update_post_meta($question_id, '_course_ids', $new_courses);
            }
        }

        // Update Lessons
        if (!empty($lesson_ids)) {
            $current_lessons = get_post_meta($question_id, '_lesson_ids', true);
            if (!is_array($current_lessons))
                $current_lessons = [];

            $new_lessons = array_unique(array_merge($current_lessons, $lesson_ids));
            $new_lessons = array_map('absint', $new_lessons);
            sort($new_lessons);

            $current_lessons = array_map('absint', $current_lessons);
            sort($current_lessons);

            if ($new_lessons !== $current_lessons) {
                update_post_meta($question_id, '_lesson_ids', $new_lessons);
            }
        }
    }

    /**
     * Manual sync function to rebuild all quiz course_ids
     * Can be called from admin tools or migration scripts
     * 
     * @return array Stats about the sync
     */
    public static function sync_all_quizzes()
    {
        $quizzes = get_posts([
            'post_type' => 'qe_quiz',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'fields' => 'ids'
        ]);

        $synced = 0;
        $errors = 0;

        foreach ($quizzes as $quiz_id) {
            try {
                $instance = new self();
                $instance->rebuild_quiz_course_ids($quiz_id);
                $synced++;
            } catch (Exception $e) {
                $errors++;
            }
        }

        return [
            'total' => count($quizzes),
            'synced' => $synced,
            'errors' => $errors
        ];
    }
}
