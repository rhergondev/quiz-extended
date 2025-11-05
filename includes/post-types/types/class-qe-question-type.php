<?php
/**
 * QE_Question_Type Class
 *
 * Handles registration of Question Custom Post Type
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

class QE_Question_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_question');
        add_action('rest_after_insert_qe_question', [$this, 'sync_question_with_quizzes'], 10, 3);
        add_action('before_delete_post', [$this, 'clear_quiz_associations_on_delete'], 10, 1);

    }

    /**
     * Syncs the question with its associated quizzes after saving.
     *
     * @param WP_Post         $post_inserted  The post of the question being saved.
     * @param WP_REST_Request $request        The REST API request.
     * @param bool            $creating       True if creating, false if updating.
     */
    public function sync_question_with_quizzes($post_inserted, $request, $creating)
    {
        $question_id = $post_inserted->ID;

        // Obtener los IDs de los cuestionarios nuevos desde la solicitud de la API
        $new_quiz_ids = $request->get_param('meta')['_quiz_ids'] ?? [];
        $new_quiz_ids = array_map('absint', $new_quiz_ids);

        // Obtener los IDs de los cuestionarios antiguos (antes de guardar)
        $old_quiz_ids = get_post_meta($question_id, '_quiz_ids_before_save', true);
        if (!is_array($old_quiz_ids)) {
            $old_quiz_ids = [];
        }

        $quizzes_to_add_to = array_diff($new_quiz_ids, $old_quiz_ids);
        $quizzes_to_remove_from = array_diff($old_quiz_ids, $new_quiz_ids);

        // Añadir la pregunta a los nuevos cuestionarios
        foreach ($quizzes_to_add_to as $quiz_id) {
            $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
            if (!is_array($question_ids)) {
                $question_ids = [];
            }
            if (!in_array($question_id, $question_ids)) {
                $question_ids[] = $question_id;
                update_post_meta($quiz_id, '_quiz_question_ids', $question_ids);
            }
        }

        // Eliminar la pregunta de los cuestionarios antiguos
        foreach ($quizzes_to_remove_from as $quiz_id) {
            $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
            if (is_array($question_ids)) {
                $updated_ids = array_diff($question_ids, [$question_id]);
                update_post_meta($quiz_id, '_quiz_question_ids', array_values($updated_ids));
            }
        }

        // Guardar el estado actual para la próxima actualización
        update_post_meta($question_id, '_quiz_ids_before_save', $new_quiz_ids);
    }

    /**
     * Cleans the associations when a question is permanently deleted.
     *
     * @param int $post_id The ID of the post being deleted.
     */
    public function clear_quiz_associations_on_delete($post_id)
    {
        if (get_post_type($post_id) !== 'qe_question') {
            return;
        }

        $quiz_ids = get_post_meta($post_id, '_quiz_ids_before_save', true);
        if (!is_array($quiz_ids))
            return;

        foreach ($quiz_ids as $quiz_id) {
            $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
            if (is_array($question_ids)) {
                $updated_ids = array_diff($question_ids, [$post_id]);
                update_post_meta($quiz_id, '_quiz_question_ids', array_values($updated_ids));
            }
        }
    }

    /**
     * Get labels for Question post type
     *
     * @return array Question labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Questions', 'quiz-extended'),
            'singular_name' => __('Question', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Question', 'quiz-extended'),
            'edit_item' => __('Edit Question', 'quiz-extended'),
            'new_item' => __('New Question', 'quiz-extended'),
            'view_item' => __('View Question', 'quiz-extended'),
            'search_items' => __('Search Questions', 'quiz-extended'),
            'not_found' => __('No questions found', 'quiz-extended'),
            'not_found_in_trash' => __('No questions found in trash', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Question post type
     *
     * @return array Question args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('Question bank for quizzes', 'quiz-extended'),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=qe_course',
            'supports' => [
                'title',
                'editor',
                'custom-fields',
                'author'
            ],
            'rewrite' => false,
        ];

        // Merge with default REST and capability args
        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}