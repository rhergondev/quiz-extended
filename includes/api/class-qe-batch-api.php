<?php
/**
 * QE_Batch_API Class
 *
 * Handles batch operations API endpoints
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Batch_API extends QE_API_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Register batch operation routes
     */
    public function register_routes()
    {
        register_rest_route('quiz-extended/v1', '/batch/update-question-difficulty', [
            'methods' => 'POST',
            'callback' => [$this, 'batch_update_question_difficulty'],
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ]);

        register_rest_route('quiz-extended/v1', '/batch/sync-question-lessons', [
            'methods' => 'POST',
            'callback' => [$this, 'sync_question_lessons'],
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            },
            'args' => [
                'question_ids' => [
                    'required' => true,
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ],
                'lesson_id' => [
                    'required' => true,
                    'type' => 'integer',
                    'minimum' => 1,
                ],
            ],
        ]);
    }

    /**
     * Batch update question difficulty from their associated quizzes
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function batch_update_question_difficulty($request)
    {
        global $wpdb;

        $stats = [
            'quizzes_processed' => 0,
            'questions_updated' => 0,
            'questions_skipped' => 0,
            'errors' => []
        ];

        // Get all quizzes with their difficulty and questions
        $quizzes = get_posts([
            'post_type' => 'qe_quiz',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'ID',
            'order' => 'ASC'
        ]);

        foreach ($quizzes as $quiz) {
            $quiz_id = $quiz->ID;

            // Get quiz difficulty
            $quiz_difficulty = get_post_meta($quiz_id, '_difficulty_level', true);

            if (empty($quiz_difficulty)) {
                $quiz_difficulty = 'medium'; // Default
            }

            // Get questions associated with this quiz
            $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

            if (empty($question_ids) || !is_array($question_ids)) {
                continue;
            }

            $stats['quizzes_processed']++;

            foreach ($question_ids as $question_id) {
                // Get current question difficulty
                $current_difficulty = get_post_meta($question_id, '_difficulty_level', true);

                // Update only if different
                if ($current_difficulty === $quiz_difficulty) {
                    $stats['questions_skipped']++;
                } else {
                    $updated = update_post_meta($question_id, '_difficulty_level', $quiz_difficulty);

                    if ($updated) {
                        $stats['questions_updated']++;
                    } else {
                        $stats['errors'][] = "Failed to update question #{$question_id}";
                    }
                }
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => sprintf(
                __('Batch update completed. %d questions updated, %d skipped.', 'quiz-extended'),
                $stats['questions_updated'],
                $stats['questions_skipped']
            ),
            'stats' => $stats
        ], 200);
    }

    /**
     * Sync _question_lesson and _lesson_ids on a set of questions to point to a given lesson.
     * Called when a quiz is saved into a lesson step so that the question bank's
     * lesson associations stay in sync with the denormalized meta fields.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function sync_question_lessons($request)
    {
        $question_ids = array_filter(array_map('absint', (array) $request->get_param('question_ids')));
        $lesson_id    = absint($request->get_param('lesson_id'));

        if (empty($question_ids) || !$lesson_id) {
            return new WP_REST_Response(['success' => false, 'message' => 'Invalid parameters'], 400);
        }

        $updated = 0;

        foreach ($question_ids as $question_id) {
            // Legacy single-value field
            update_post_meta($question_id, '_question_lesson', $lesson_id);

            // Array field — merge with existing lesson IDs to preserve other associations
            $existing = get_post_meta($question_id, '_lesson_ids', true);
            if (!is_array($existing)) {
                $existing = [];
            }
            $existing[] = $lesson_id;
            update_post_meta($question_id, '_lesson_ids', array_values(array_unique($existing)));

            $updated++;
        }

        return new WP_REST_Response([
            'success' => true,
            'updated' => $updated,
        ], 200);
    }
}
