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
        add_action('rest_after_insert_qe_question', [$this, 'sync_question_with_course'], 20, 3);
        add_action('before_delete_post', [$this, 'clear_quiz_associations_on_delete'], 10, 1);
        add_action('before_delete_post', [$this, 'clear_course_association_on_delete'], 10, 1);

        // 🔥 Add custom query filters for REST API
        add_filter('rest_qe_question_query', [$this, 'add_custom_query_filters'], 10, 2);
    }

    /**
     * Add custom query filters for REST API
     * Handles status_filters (favorites, failed, etc.) and array-based taxonomies
     *
     * @param array           $args    The WP_Query arguments.
     * @param WP_REST_Request $request The REST API request.
     * @return array Modified arguments.
     */
    public function add_custom_query_filters($args, $request)
    {
        global $wpdb;
        $user_id = get_current_user_id();

        // 1. Handle qe_category array/comma-separated
        if ($request->get_param('qe_category')) {
            $cats = $request->get_param('qe_category');
            if (is_string($cats)) {
                $cats = explode(',', $cats);
            }

            if (!empty($cats) && is_array($cats)) {
                // Ensure tax_query exists
                if (!isset($args['tax_query'])) {
                    $args['tax_query'] = [];
                }

                // Add category filter
                $args['tax_query'][] = [
                    'taxonomy' => 'qe_category',
                    'field' => 'term_id',
                    'terms' => array_map('absint', $cats),
                    'operator' => 'IN',
                ];
            }
        }

        // 2. Handle status_filters
        $status_filters = $request->get_param('status_filters');
        if ($status_filters && is_string($status_filters)) {
            $status_filters = explode(',', $status_filters);
        }

        if (!empty($status_filters) && $user_id) {
            $include_ids = [];
            $exclude_ids = [];
            $has_inclusion_filter = false;

            // Favorites
            if (in_array('favorites', $status_filters)) {
                $has_inclusion_filter = true;
                $fav_table = $wpdb->prefix . 'qe_favorite_questions';
                $fav_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT question_id FROM {$fav_table} WHERE user_id = %d",
                    $user_id
                ));
                $include_ids = array_merge($include_ids, $fav_ids);
            }

            // Failed (Questions answered incorrectly at least once)
            if (in_array('failed', $status_filters)) {
                $has_inclusion_filter = true;
                $answers_table = $wpdb->prefix . 'qe_attempt_answers';
                $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

                $failed_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT DISTINCT a.question_id 
                     FROM {$answers_table} a
                     INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                     WHERE att.user_id = %d AND a.is_correct = 0",
                    $user_id
                ));
                $include_ids = array_merge($include_ids, $failed_ids);
            }

            // Risked (Questions answered with risk)
            if (in_array('risked', $status_filters)) {
                $has_inclusion_filter = true;
                $answers_table = $wpdb->prefix . 'qe_attempt_answers';
                $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

                $risked_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT DISTINCT a.question_id 
                     FROM {$answers_table} a
                     INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                     WHERE att.user_id = %d AND a.is_risked = 1",
                    $user_id
                ));
                $include_ids = array_merge($include_ids, $risked_ids);
            }

            // Unanswered (Questions never answered by user)
            if (in_array('unanswered', $status_filters)) {
                // For unanswered, we want to EXCLUDE questions the user HAS answered
                $answers_table = $wpdb->prefix . 'qe_attempt_answers';
                $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

                $answered_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT DISTINCT a.question_id 
                     FROM {$answers_table} a
                     INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                     WHERE att.user_id = %d",
                    $user_id
                ));

                // If we have other inclusion filters (e.g. favorites), we need to intersect
                // But "unanswered" and "failed" are mutually exclusive for a single question instance usually,
                // but a user might have failed it once and then it's not unanswered.
                // If user selects "Failed" AND "Unanswered", they probably want (Failed OR Unanswered).
                // But WP_Query post__in is an AND with post__not_in.

                // Strategy: If "Unanswered" is selected, we cannot simply use post__not_in if we also have post__in from others.
                // We need to build a complex query or handle the logic carefully.

                // If ONLY unanswered is selected:
                if (!$has_inclusion_filter) {
                    $args['post__not_in'] = array_merge($args['post__not_in'] ?? [], $answered_ids);
                } else {
                    // If mixed filters (e.g. Favorites OR Unanswered), it's tricky with standard WP_Query args.
                    // Usually filters are AND. "Favorites AND Unanswered" -> Impossible if favorites implies interaction? 
                    // Actually, you can favorite a question without answering it? Maybe.

                    // Let's assume the user wants questions that match ANY of the selected criteria (OR logic)
                    // But standard UI filters usually imply AND or OR depending on context.
                    // In a generator, "Favorites" AND "Failed" usually means "Favorites that I also failed".
                    // But "Unanswered" is special.

                    // Let's stick to:
                    // If Unanswered is selected, we exclude answered IDs.
                    // If other filters are selected, we include those IDs.
                    // If both, we might get 0 results if they are mutually exclusive.

                    // However, if the user selects "Failed" and "Unanswered", they likely want questions that are EITHER failed OR unanswered.
                    // Implementing OR logic in WP_Query is hard without raw SQL.

                    // For now, let's implement as:
                    // If Unanswered is selected, add answered_ids to exclude list.
                    // BUT if we have include_ids, we need to be careful.

                    // Let's assume AND logic for now as it's standard.
                    // "Favorites" AND "Unanswered" = Favorites that I haven't answered yet.
                    $exclude_ids = array_merge($exclude_ids, $answered_ids);
                }
            }

            // Apply inclusions
            if ($has_inclusion_filter) {
                $include_ids = array_unique($include_ids);
                if (empty($include_ids)) {
                    // Force no results if filters yielded no IDs
                    $include_ids = [0];
                }

                // If post__in already exists, intersect
                if (!empty($args['post__in'])) {
                    $args['post__in'] = array_intersect($args['post__in'], $include_ids);
                    if (empty($args['post__in']))
                        $args['post__in'] = [0];
                } else {
                    $args['post__in'] = $include_ids;
                }
            }

            // Apply exclusions
            if (!empty($exclude_ids)) {
                $exclude_ids = array_unique($exclude_ids);
                $args['post__not_in'] = array_merge($args['post__not_in'] ?? [], $exclude_ids);
            }
        }

        return $args;
    }

    /**
     * Syncs the question with its parent course after saving.
     *
     * @param WP_Post         $post_inserted  The post of the question being saved.
     * @param WP_REST_Request $request        The REST API request.
     * @param bool            $creating       True if creating, false if updating.
     */
    public function sync_question_with_course($post_inserted, $request, $creating)
    {
        $question_id = $post_inserted->ID;

        // Get new course ID from the request
        $new_course_id = $request->get_param('meta')['_course_id'] ?? 0;
        $new_course_id = absint($new_course_id);

        // Get old course ID (before save)
        $old_course_id = get_post_meta($question_id, '_course_id_before_save', true);
        $old_course_id = absint($old_course_id);

        // If the course hasn't changed, do nothing
        if ($old_course_id === $new_course_id) {
            return;
        }

        // Remove question from old course's _question_ids
        if ($old_course_id > 0) {
            $question_ids = get_post_meta($old_course_id, '_question_ids', true);
            if (is_array($question_ids)) {
                $updated_ids = array_diff($question_ids, [$question_id]);
                update_post_meta($old_course_id, '_question_ids', array_values($updated_ids));
            }
        }

        // Add question to new course's _question_ids
        if ($new_course_id > 0) {
            $question_ids = get_post_meta($new_course_id, '_question_ids', true);
            if (!is_array($question_ids)) {
                $question_ids = [];
            }
            if (!in_array($question_id, $question_ids)) {
                $question_ids[] = $question_id;
                update_post_meta($new_course_id, '_question_ids', $question_ids);
            }
        }

        // Save current state for next update
        update_post_meta($question_id, '_course_id_before_save', $new_course_id);
    }

    /**
     * Cleans the course association when a question is permanently deleted.
     *
     * @param int $post_id The ID of the post being deleted.
     */
    public function clear_course_association_on_delete($post_id)
    {
        if (get_post_type($post_id) !== 'qe_question') {
            return;
        }

        $course_id = get_post_meta($post_id, '_course_id_before_save', true);
        if (!$course_id) {
            return;
        }

        $question_ids = get_post_meta($course_id, '_question_ids', true);
        if (is_array($question_ids)) {
            $updated_ids = array_diff($question_ids, [$post_id]);
            update_post_meta($course_id, '_question_ids', array_values($updated_ids));
        }
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