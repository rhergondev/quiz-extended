<?php
/**
 * QE_Lesson_Type Class
 *
 * Handles registration of Lesson Custom Post Type
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

class QE_Lesson_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_lesson');
        add_action('rest_after_insert_qe_lesson', [$this, 'sync_lesson_with_course'], 10, 3);
        add_action('before_delete_post', [$this, 'clear_course_associations_on_delete'], 10, 1);
    }

    /**
     * Syncs the lesson with its associated course after saving.
     *
     * @param WP_Post         $post_inserted  The post of the lesson being saved.
     * @param WP_REST_Request $request        The REST API request.
     * @param bool            $creating       True if creating, false if updating.
     */
    public function sync_lesson_with_course($post_inserted, $request, $creating)
    {
        $lesson_id = $post_inserted->ID;

        // Obtener el ID del curso nuevo desde la solicitud de la API
        $new_course_id = $request->get_param('meta')['_course_id'] ?? 0;
        $new_course_id = absint($new_course_id);

        // Obtener el ID del curso antiguo (antes de guardar)
        $old_course_id = get_post_meta($lesson_id, '_course_id_before_save', true);
        $old_course_id = absint($old_course_id);

        // Si no ha cambiado, no hacer nada
        if ($new_course_id === $old_course_id) {
            return;
        }

        // Eliminar la lección del curso antiguo
        if ($old_course_id > 0) {
            $lesson_ids = get_post_meta($old_course_id, '_lesson_ids', true);
            if (is_array($lesson_ids)) {
                $updated_ids = array_diff($lesson_ids, [$lesson_id]);
                update_post_meta($old_course_id, '_lesson_ids', array_values($updated_ids));
            }
        }

        // Añadir la lección al nuevo curso
        if ($new_course_id > 0 && get_post_type($new_course_id) === 'qe_course') {
            $lesson_ids = get_post_meta($new_course_id, '_lesson_ids', true);
            if (!is_array($lesson_ids)) {
                $lesson_ids = [];
            }
            if (!in_array($lesson_id, $lesson_ids)) {
                $lesson_ids[] = $lesson_id;
                update_post_meta($new_course_id, '_lesson_ids', $lesson_ids);
            }
        }

        // Guardar el estado actual para la próxima actualización
        update_post_meta($lesson_id, '_course_id_before_save', $new_course_id);
    }

    /**
     * Cleans the course associations when a lesson is permanently deleted.
     *
     * @param int $post_id The ID of the post being deleted.
     */
    public function clear_course_associations_on_delete($post_id)
    {
        if (get_post_type($post_id) !== 'qe_lesson') {
            return;
        }

        $course_id = get_post_meta($post_id, '_course_id_before_save', true);
        if (!$course_id) {
            return;
        }

        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
        if (is_array($lesson_ids)) {
            $updated_ids = array_diff($lesson_ids, [$post_id]);
            update_post_meta($course_id, '_lesson_ids', array_values($updated_ids));
        }
    }

    /**
     * Get labels for Lesson post type
     *
     * @return array Lesson labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Lessons', 'quiz-extended'),
            'singular_name' => __('Lesson', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Lesson', 'quiz-extended'),
            'edit_item' => __('Edit Lesson', 'quiz-extended'),
            'new_item' => __('New Lesson', 'quiz-extended'),
            'view_item' => __('View Lesson', 'quiz-extended'),
            'search_items' => __('Search Lessons', 'quiz-extended'),
            'not_found' => __('No lessons found', 'quiz-extended'),
            'not_found_in_trash' => __('No lessons found in trash', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Lesson post type
     *
     * @return array Lesson args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('Lessons that belong to courses', 'quiz-extended'),
            'public' => true,
            'hierarchical' => true,
            'show_in_menu' => 'edit.php?post_type=qe_course',
            'supports' => [
                'title',
                'editor',
                'page-attributes',
                'author',
                'custom-fields',
                'thumbnail'
            ],
            'rewrite' => ['slug' => 'lessons'],
        ];

        // Merge with default REST and capability args
        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}