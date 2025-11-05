<?php
/**
 * QE_Quiz_Type Class
 *
 * Handles registration of Quiz Custom Post Type
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/types
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Quiz_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_quiz');
        add_action('rest_after_insert_qe_quiz', [$this, 'sync_quiz_with_course_and_lessons'], 10, 3);
        add_action('before_delete_post', [$this, 'clear_associations_on_delete'], 10, 1);
    }

    /**
     * Syncs the quiz with its associated course and lessons after saving.
     *
     * @param WP_Post         $post_inserted  The post of the quiz being saved.
     * @param WP_REST_Request $request        The REST API request.
     * @param bool            $creating       True if creating, false if updating.
     */
    public function sync_quiz_with_course_and_lessons($post_inserted, $request, $creating)
    {
        $quiz_id = $post_inserted->ID;

        // Sincronizar con el curso
        $new_course_id = $request->get_param('meta')['_course_id'] ?? 0;
        $new_course_id = absint($new_course_id);

        $old_course_id = get_post_meta($quiz_id, '_course_id_before_save', true);
        $old_course_id = absint($old_course_id);

        if ($new_course_id !== $old_course_id) {
            // Eliminar del curso antiguo
            if ($old_course_id > 0) {
                $quiz_ids = get_post_meta($old_course_id, '_quiz_ids', true);
                if (is_array($quiz_ids)) {
                    $updated_ids = array_diff($quiz_ids, [$quiz_id]);
                    update_post_meta($old_course_id, '_quiz_ids', array_values($updated_ids));
                }
            }

            // Añadir al nuevo curso
            if ($new_course_id > 0 && get_post_type($new_course_id) === 'qe_course') {
                $quiz_ids = get_post_meta($new_course_id, '_quiz_ids', true);
                if (!is_array($quiz_ids)) {
                    $quiz_ids = [];
                }
                if (!in_array($quiz_id, $quiz_ids)) {
                    $quiz_ids[] = $quiz_id;
                    update_post_meta($new_course_id, '_quiz_ids', $quiz_ids);
                }
            }

            update_post_meta($quiz_id, '_course_id_before_save', $new_course_id);
        }

        // Sincronizar con lecciones
        $new_lesson_ids = $request->get_param('meta')['_lesson_ids'] ?? [];
        $new_lesson_ids = array_map('absint', $new_lesson_ids);

        $old_lesson_ids = get_post_meta($quiz_id, '_lesson_ids_before_save', true);
        if (!is_array($old_lesson_ids)) {
            $old_lesson_ids = [];
        }

        $lessons_to_add = array_diff($new_lesson_ids, $old_lesson_ids);
        $lessons_to_remove = array_diff($old_lesson_ids, $new_lesson_ids);

        // Eliminar de lecciones antiguas
        foreach ($lessons_to_remove as $lesson_id) {
            $quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
            if (is_array($quiz_ids)) {
                $updated_ids = array_diff($quiz_ids, [$quiz_id]);
                update_post_meta($lesson_id, '_quiz_ids', array_values($updated_ids));
            }
        }

        // Añadir a nuevas lecciones
        foreach ($lessons_to_add as $lesson_id) {
            if (get_post_type($lesson_id) === 'qe_lesson') {
                $quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
                if (!is_array($quiz_ids)) {
                    $quiz_ids = [];
                }
                if (!in_array($quiz_id, $quiz_ids)) {
                    $quiz_ids[] = $quiz_id;
                    update_post_meta($lesson_id, '_quiz_ids', $quiz_ids);
                }
            }
        }

        update_post_meta($quiz_id, '_lesson_ids_before_save', $new_lesson_ids);
    }

    /**
     * Cleans the associations when a quiz is permanently deleted.
     *
     * @param int $post_id The ID of the post being deleted.
     */
    public function clear_associations_on_delete($post_id)
    {
        if (get_post_type($post_id) !== 'qe_quiz') {
            return;
        }

        // Limpiar asociación con curso
        $course_id = get_post_meta($post_id, '_course_id_before_save', true);
        if ($course_id) {
            $quiz_ids = get_post_meta($course_id, '_quiz_ids', true);
            if (is_array($quiz_ids)) {
                $updated_ids = array_diff($quiz_ids, [$post_id]);
                update_post_meta($course_id, '_quiz_ids', array_values($updated_ids));
            }
        }

        // Limpiar asociaciones con lecciones
        $lesson_ids = get_post_meta($post_id, '_lesson_ids_before_save', true);
        if (is_array($lesson_ids)) {
            foreach ($lesson_ids as $lesson_id) {
                $quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
                if (is_array($quiz_ids)) {
                    $updated_ids = array_diff($quiz_ids, [$post_id]);
                    update_post_meta($lesson_id, '_quiz_ids', array_values($updated_ids));
                }
            }
        }
    }

    /**
     * Get labels for Quiz post type
     *
     * @return array Quiz labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Quizzes', 'quiz-extended'),
            'singular_name' => __('Quiz', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Quiz', 'quiz-extended'),
            'edit_item' => __('Edit Quiz', 'quiz-extended'),
            'new_item' => __('New Quiz', 'quiz-extended'),
            'view_item' => __('View Quiz', 'quiz-extended'),
            'search_items' => __('Search Quizzes', 'quiz-extended'),
            'not_found' => __('No quizzes found', 'quiz-extended'),
            'not_found_in_trash' => __('No quizzes found in trash', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Quiz post type
     *
     * @return array Quiz args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('Assessment quizzes', 'quiz-extended'),
            'public' => true,
            'publicly_queryable' => true,
            'hierarchical' => true,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=qe_course',
            'supports' => [
                'title',
                'editor',
                'author',
                'custom-fields',
                'excerpt',
                'thumbnail'
            ],
            'rewrite' => ['slug' => 'quizzes'],
        ];

        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}