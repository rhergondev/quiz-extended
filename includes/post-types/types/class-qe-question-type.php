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
        add_action('rest_after_insert_qe_question', [$this, 'derive_course_and_lesson_associations'], 20, 3);
        add_action('before_delete_post', [$this, 'clear_quiz_associations_on_delete'], 10, 1);
        add_action('before_delete_post', [$this, 'clear_all_associations_on_delete'], 10, 1);

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

        // 2. Handle course_id filter - INDIRECT SEARCH through quizzes
        // Questions don't reliably store course_ids directly, so we find quizzes for that course,
        // then get the question IDs directly from the quiz's _quiz_question_ids
        if ($request->get_param('course_id')) {
            $course_id = absint($request->get_param('course_id'));

            if ($course_id > 0) {
                // Get all quiz IDs that belong to this course
                $quiz_ids = $this->get_quiz_ids_for_course($course_id);

                if (!empty($quiz_ids)) {
                    // Get question IDs directly from quizzes' _quiz_question_ids
                    $question_ids = $this->get_question_ids_from_quizzes($quiz_ids);

                    if (!empty($question_ids)) {
                        // Use post__in to filter by these question IDs
                        $args['post__in'] = $question_ids;
                    } else {
                        // No questions found in these quizzes
                        $args['post__in'] = [0];
                    }
                } else {
                    // No quizzes found for this course, return no results
                    $args['post__in'] = [0];
                }
            }
        }

        // 3. Handle lessons filter - INDIRECT SEARCH through quizzes
        // Questions don't store lesson_ids directly, so we find quizzes for those lessons,
        // then get the question IDs directly from the quiz's _quiz_question_ids
        if ($request->get_param('lessons')) {
            $lessons = $request->get_param('lessons');
            if (is_string($lessons)) {
                $lessons = explode(',', $lessons);
            }

            if (!empty($lessons) && is_array($lessons)) {
                $lessons = array_map('absint', $lessons);

                // Step 1: Find all quiz IDs that belong to these lessons
                $quiz_ids = $this->get_quiz_ids_for_lessons($lessons);

                if (!empty($quiz_ids)) {
                    // Step 2: Get question IDs directly from quizzes' _quiz_question_ids
                    $question_ids = $this->get_question_ids_from_quizzes($quiz_ids);

                    if (!empty($question_ids)) {
                        // Use post__in to filter by these question IDs
                        // If there's already a post__in, intersect them
                        if (isset($args['post__in']) && !empty($args['post__in']) && $args['post__in'] !== [0]) {
                            $args['post__in'] = array_intersect($args['post__in'], $question_ids);
                            if (empty($args['post__in'])) {
                                $args['post__in'] = [0]; // No intersection, return no results
                            }
                        } else {
                            $args['post__in'] = $question_ids;
                        }
                    } else {
                        // No questions found in these quizzes
                        $args['post__in'] = [0];
                    }
                } else {
                    // No quizzes found for these lessons, return no results
                    $args['post__in'] = [0];
                }
            }
        }

        // 4. Handle difficulty filter (meta field _difficulty_level)
        // Support both 'difficulty' and 'qe_difficulty' params
        $difficulty = $request->get_param('difficulty') ?: $request->get_param('qe_difficulty');

        if ($difficulty) {
            $difficulty = sanitize_text_field($difficulty);

            // Valid values: 'easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'
            $valid_difficulties = ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'];

            if (in_array($difficulty, $valid_difficulties)) {
                if (!isset($args['meta_query'])) {
                    $args['meta_query'] = [];
                }

                $args['meta_query'][] = [
                    'key' => '_difficulty_level',
                    'value' => $difficulty,
                    'compare' => '='
                ];
            }
        }

        // 5. Handle status_filters
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

            // Failed (Questions answered incorrectly in the LATEST attempt)
            if (in_array('failed', $status_filters)) {
                $has_inclusion_filter = true;
                $answers_table = $wpdb->prefix . 'qe_attempt_answers';
                $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

                // 🔥 FIX: Select questions where the LATEST answer is incorrect AND was answered
                // We use a subquery to find the latest attempt_id for each question/user pair
                $failed_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT DISTINCT a.question_id 
                     FROM {$answers_table} a
                     INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                     WHERE att.user_id = %d 
                     AND a.attempt_id = (
                        SELECT MAX(a2.attempt_id)
                        FROM {$answers_table} a2
                        INNER JOIN {$attempts_table} att2 ON a2.attempt_id = att2.attempt_id
                        WHERE att2.user_id = %d AND a2.question_id = a.question_id
                     )
                     AND a.is_correct = 0
                     AND a.answer_given IS NOT NULL",
                    $user_id,
                    $user_id
                ));
                $include_ids = array_merge($include_ids, $failed_ids);
            }

            // Risked (Questions answered with risk in the LATEST attempt)
            if (in_array('risked', $status_filters)) {
                $has_inclusion_filter = true;
                $answers_table = $wpdb->prefix . 'qe_attempt_answers';
                $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

                // 🔥 FIX: Select questions where the LATEST answer was risked AND was answered
                $risked_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT DISTINCT a.question_id 
                     FROM {$answers_table} a
                     INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                     WHERE att.user_id = %d 
                     AND a.attempt_id = (
                        SELECT MAX(a2.attempt_id)
                        FROM {$answers_table} a2
                        INNER JOIN {$attempts_table} att2 ON a2.attempt_id = att2.attempt_id
                        WHERE att2.user_id = %d AND a2.question_id = a.question_id
                     )
                     AND a.is_risked = 1
                     AND a.answer_given IS NOT NULL",
                    $user_id,
                    $user_id
                ));
                $include_ids = array_merge($include_ids, $risked_ids);
            }

            // Unanswered (Questions seen in LATEST attempt but left blank)
            if (in_array('unanswered', $status_filters)) {
                $has_inclusion_filter = true;
                $answers_table = $wpdb->prefix . 'qe_attempt_answers';
                $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

                $unanswered_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT DISTINCT a.question_id 
                     FROM {$answers_table} a
                     INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                     WHERE att.user_id = %d 
                     AND a.attempt_id = (
                        SELECT MAX(a2.attempt_id)
                        FROM {$answers_table} a2
                        INNER JOIN {$attempts_table} att2 ON a2.attempt_id = att2.attempt_id
                        WHERE att2.user_id = %d AND a2.question_id = a.question_id
                     )
                     AND (a.answer_given IS NULL OR a.answer_given = '')",
                    $user_id,
                    $user_id
                ));
                $include_ids = array_merge($include_ids, $unanswered_ids);
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
     * 🆕 Deriva las asociaciones de curso y lección desde los quizzes.
     * Una pregunta pertenece a los cursos/lecciones de todos sus quizzes.
     *
     * @param WP_Post         $post_inserted  The post of the question being saved.
     * @param WP_REST_Request $request        The REST API request.
     * @param bool            $creating       True if creating, false if updating.
     */
    public function derive_course_and_lesson_associations($post_inserted, $request, $creating)
    {
        $question_id = $post_inserted->ID;

        // Obtener todos los quizzes de esta pregunta
        $quiz_ids = get_post_meta($question_id, '_quiz_ids', true);
        if (!is_array($quiz_ids)) {
            $quiz_ids = [];
        }

        $course_ids = [];
        $lesson_ids = [];

        // Para cada quiz, obtener sus cursos y lecciones
        foreach ($quiz_ids as $quiz_id) {
            // Obtener cursos del quiz
            $quiz_course_ids = get_post_meta($quiz_id, '_course_ids', true);
            if (!is_array($quiz_course_ids)) {
                // Fallback al campo legacy
                $legacy_course_id = get_post_meta($quiz_id, '_course_id', true);
                if ($legacy_course_id) {
                    $quiz_course_ids = [absint($legacy_course_id)];
                } else {
                    $quiz_course_ids = [];
                }
            }
            $course_ids = array_merge($course_ids, $quiz_course_ids);

            // Obtener lecciones del quiz
            $quiz_lesson_ids = get_post_meta($quiz_id, '_lesson_ids', true);
            if (!is_array($quiz_lesson_ids)) {
                $quiz_lesson_ids = [];
            }
            $lesson_ids = array_merge($lesson_ids, $quiz_lesson_ids);
        }

        // Eliminar duplicados
        $course_ids = array_unique(array_filter(array_map('absint', $course_ids)));
        $lesson_ids = array_unique(array_filter(array_map('absint', $lesson_ids)));

        // Actualizar meta fields de la pregunta
        update_post_meta($question_id, '_course_ids', $course_ids);
        update_post_meta($question_id, '_lesson_ids', $lesson_ids);

        // Actualizar campos legacy para compatibilidad
        if (!empty($course_ids)) {
            update_post_meta($question_id, '_course_id', $course_ids[0]);
        } else {
            delete_post_meta($question_id, '_course_id');
        }

        if (!empty($lesson_ids)) {
            update_post_meta($question_id, '_question_lesson', $lesson_ids[0]);
        } else {
            delete_post_meta($question_id, '_question_lesson');
        }
    }

    /**
     * Limpia todas las asociaciones cuando una pregunta se elimina.
     *
     * @param int $post_id The ID of the post being deleted.
     */
    public function clear_all_associations_on_delete($post_id)
    {
        if (get_post_type($post_id) !== 'qe_question') {
            return;
        }

        // Limpiar asociaciones con cursos
        $course_ids = get_post_meta($post_id, '_course_ids', true);
        if (is_array($course_ids)) {
            foreach ($course_ids as $course_id) {
                $question_ids = get_post_meta($course_id, '_question_ids', true);
                if (is_array($question_ids)) {
                    $updated_ids = array_diff($question_ids, [$post_id]);
                    update_post_meta($course_id, '_question_ids', array_values($updated_ids));
                }
            }
        }

        // Limpiar asociaciones con lecciones
        $lesson_ids = get_post_meta($post_id, '_lesson_ids', true);
        if (is_array($lesson_ids)) {
            foreach ($lesson_ids as $lesson_id) {
                $question_ids = get_post_meta($lesson_id, '_question_ids', true);
                if (is_array($question_ids)) {
                    $updated_ids = array_diff($question_ids, [$post_id]);
                    update_post_meta($lesson_id, '_question_ids', array_values($updated_ids));
                }
            }
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

    /**
     * Get quiz IDs that belong to the specified lessons
     * Used for indirect lesson filtering of questions
     * 
     * The relationship is: Lesson._lesson_steps[].data.quiz_id → Quiz
     *
     * @param array $lesson_ids Array of lesson IDs
     * @return array Array of quiz IDs
     */
    private function get_quiz_ids_for_lessons($lesson_ids)
    {
        global $wpdb;

        if (empty($lesson_ids)) {
            return [];
        }

        $quiz_ids = [];

        // For each lesson, get the _lesson_steps meta and extract quiz_ids
        $placeholders = implode(',', array_fill(0, count($lesson_ids), '%d'));

        $query = $wpdb->prepare(
            "SELECT pm.meta_value 
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
             WHERE p.ID IN ({$placeholders})
             AND p.post_type = 'qe_lesson'
             AND pm.meta_key = '_lesson_steps'",
            ...$lesson_ids
        );

        $results = $wpdb->get_col($query);

        foreach ($results as $meta_value) {
            $steps = maybe_unserialize($meta_value);

            if (!is_array($steps)) {
                continue;
            }

            foreach ($steps as $step) {
                // Only process quiz type steps
                if (isset($step['type']) && $step['type'] === 'quiz') {
                    if (isset($step['data']['quiz_id']) && !empty($step['data']['quiz_id'])) {
                        $quiz_ids[] = absint($step['data']['quiz_id']);
                    }
                }
            }
        }

        return array_unique($quiz_ids);
    }

    /**
     * Get quiz IDs that belong to the specified course
     * Used for indirect course filtering of questions
     * 
     * The relationship is: Course → Lessons._course_id → Lesson._lesson_steps[].quiz_id → Quiz
     *
     * @param int $course_id Course ID
     * @return array Array of quiz IDs
     */
    private function get_quiz_ids_for_course($course_id)
    {
        global $wpdb;

        if (empty($course_id)) {
            return [];
        }

        // Step 1: Get all lessons for this course
        $lesson_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT p.ID 
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
             WHERE p.post_type = 'qe_lesson'
             AND p.post_status IN ('publish', 'draft', 'private')
             AND pm.meta_key = '_course_id'
             AND pm.meta_value = %d",
            $course_id
        ));

        if (empty($lesson_ids)) {
            return [];
        }

        // Step 2: Reuse get_quiz_ids_for_lessons to extract quiz IDs from lesson steps
        return $this->get_quiz_ids_for_lessons($lesson_ids);
    }

    /**
     * Get question IDs from quiz's _quiz_question_ids meta
     * This is the SOURCE OF TRUTH - quizzes store their question IDs, not the reverse
     * 
     * In production, questions have empty _quiz_ids, so we must read question IDs
     * directly from the quiz's _quiz_question_ids meta field
     *
     * @param array $quiz_ids Array of quiz IDs
     * @return array Array of question IDs
     */
    private function get_question_ids_from_quizzes($quiz_ids)
    {
        if (empty($quiz_ids)) {
            return [];
        }

        $question_ids = [];

        foreach ($quiz_ids as $quiz_id) {
            $quiz_question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
            
            if (!empty($quiz_question_ids) && is_array($quiz_question_ids)) {
                foreach ($quiz_question_ids as $qid) {
                    $question_ids[] = absint($qid);
                }
            }
        }

        return array_unique($question_ids);
    }
}