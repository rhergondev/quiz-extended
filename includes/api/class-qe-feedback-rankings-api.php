<?php
/**
 * QE_Feedback_Rankings_API Class
 *
 * Handles question feedback and course rankings endpoints.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Require base class
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-api-base.php';

class QE_Feedback_Rankings_API extends QE_API_Base
{
    /**
     * Register routes
     */
    public function register_routes()
    {
        // Submit question feedback
        $this->register_secure_route(
            '/question-feedback/submit',
            WP_REST_Server::CREATABLE,
            'submit_question_feedback',
            [
                'validation_schema' => [
                    'question_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'feedback_type' => [
                        'required' => true,
                        'type' => 'string',
                        'enum' => ['doubt', 'challenge', 'suggestion', 'error']
                    ],
                    'message' => [
                        'required' => true,
                        'type' => 'string',
                        'maxLength' => 5000
                    ]
                ]
            ]
        );

        // Get course rankings
        $this->register_secure_route(
            '/rankings/course/(?P<course_id>\d+)',
            WP_REST_Server::READABLE,
            'get_course_rankings'
        );

        // Get quiz rankings
        $this->register_secure_route(
            '/rankings/quiz/(?P<quiz_id>\d+)',
            WP_REST_Server::READABLE,
            'get_quiz_ranking'
        );
    }

    // ============================================================
    // QUESTION FEEDBACK
    // ============================================================

    /**
     * Submit question feedback
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function submit_question_feedback(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $question_id = $request->get_param('question_id');
            $feedback_type = $request->get_param('feedback_type');
            $message = $request->get_param('message');

            // Log API call
            $this->log_api_call('/question-feedback/submit', [
                'user_id' => $user_id,
                'question_id' => $question_id,
                'feedback_type' => $feedback_type
            ]);

            // Validate question
            $question = $this->validate_post($question_id, 'question');
            if (is_wp_error($question)) {
                return $question;
            }

            // Insert feedback
            $feedback_id = $this->db_insert('question_feedback', [
                'question_id' => $question_id,
                'user_id' => $user_id,
                'feedback_type' => $feedback_type,
                'message' => $message,
                'status' => 'unresolved',
                'date_submitted' => $this->get_mysql_timestamp()
            ], ['%d', '%d', '%s', '%s', '%s', '%s']);

            if (!$feedback_id) {
                return $this->error_response(
                    'db_error',
                    __('Could not submit feedback. Please try again.', 'quiz-extended'),
                    500
                );
            }

            $this->log_info('Question feedback submitted', [
                'feedback_id' => $feedback_id,
                'user_id' => $user_id,
                'question_id' => $question_id,
                'feedback_type' => $feedback_type
            ]);

            return $this->success_response([
                'feedback_id' => $feedback_id
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_question_feedback', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                __('An unexpected error occurred. Please try again.', 'quiz-extended'),
                500
            );
        }
    }

    // ============================================================
    // RANKINGS
    // ============================================================

    /**
     * Get quiz rankings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function get_quiz_ranking(WP_REST_Request $request)
    {
        $quiz_id = (int) $request['quiz_id'];
        $current_user_id = get_current_user_id();

        // Validate quiz
        $quiz = get_post($quiz_id);
        if (!$quiz || $quiz->post_type !== 'quiz') {
            return $this->error_response('not_found', 'Quiz no encontrado.', 404);
        }

        global $wpdb;
        $attempts_table = $this->get_table('quiz_attempts');

        // 1. Get all users ranked by their highest score for this quiz
        $all_rankings = $wpdb->get_results($wpdb->prepare(
            "SELECT a.user_id, MAX(a.score_with_risk) as score, u.display_name, u.user_email
            FROM {$attempts_table} a
            INNER JOIN {$wpdb->users} u ON a.user_id = u.ID
            WHERE a.quiz_id = %d AND a.status = 'completed'
            GROUP BY a.user_id
            ORDER BY score DESC, MAX(a.end_time) ASC", // Tie-break with earlier completion
            $quiz_id
        ));

        if (empty($all_rankings)) {
            return $this->success_response(['top' => [], 'relative' => [], 'currentUser' => null]);
        }

        // 2. Find current user's position
        $current_user_position = -1;
        foreach ($all_rankings as $index => $rank) {
            if ((int) $rank->user_id === $current_user_id) {
                $current_user_position = $index;
                break;
            }
        }

        // 3. Prepare Top 3
        $top_3 = array_slice($all_rankings, 0, 3);
        $top_3_processed = [];
        foreach ($top_3 as $index => $rank) {
            $top_3_processed[] = [
                'position' => $index + 1,
                'user_id' => (int) $rank->user_id,
                'display_name' => $rank->display_name,
                'avatar_url' => get_avatar_url($rank->user_id),
                'score' => (float) $rank->score,
            ];
        }

        // 4. Prepare Relative Ranking
        $relative_ranking_processed = [];
        if ($current_user_position !== -1) {
            $start = max(0, $current_user_position - 3);
            $length = min(count($all_rankings) - $start, 7);
            $relative_slice = array_slice($all_rankings, $start, $length);

            foreach ($relative_slice as $rank) {
                $user_global_pos = -1;
                foreach ($all_rankings as $i => $global_rank) {
                    if ($global_rank->user_id == $rank->user_id) {
                        $user_global_pos = $i + 1;
                        break;
                    }
                }

                $relative_ranking_processed[] = [
                    'position' => $user_global_pos,
                    'user_id' => (int) $rank->user_id,
                    'display_name' => $rank->display_name,
                    'avatar_url' => get_avatar_url($rank->user_id),
                    'score' => (float) $rank->score,
                ];
            }
        }

        return $this->success_response([
            'top' => $top_3_processed,
            'relative' => $relative_ranking_processed,
            'currentUser' => [
                'id' => $current_user_id,
                'position' => $current_user_position !== -1 ? $current_user_position + 1 : null,
            ]
        ]);
    }


    /**
     * Get course rankings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function get_course_rankings(WP_REST_Request $request)
    {
        try {
            $course_id = absint($request['course_id']);

            // Log API call
            $this->log_api_call('/rankings/' . $course_id, [
                'user_id' => get_current_user_id(),
                'course_id' => $course_id
            ]);

            // Validate course
            $course = $this->validate_post($course_id, 'course');
            if (is_wp_error($course)) {
                return $course;
            }

            // Get rankings
            $rankings = $this->db_get_results(
                "SELECT user_id, average_score, average_score_with_risk, 
                        total_quizzes_completed, is_fake_user, last_updated
                 FROM {$this->get_table('rankings')} 
                 WHERE course_id = %d 
                 ORDER BY average_score_with_risk DESC 
                 LIMIT 100",
                [$course_id]
            );

            // Enrich with user data
            $enriched_rankings = [];
            $position = 1;

            foreach ($rankings as $ranking) {
                $user = get_userdata($ranking->user_id);

                if (!$user) {
                    continue;
                }

                $enriched_rankings[] = [
                    'position' => $position++,
                    'user_id' => (int) $ranking->user_id,
                    'user_name' => sanitize_text_field($user->display_name),
                    'avatar_url' => get_avatar_url($ranking->user_id),
                    'average_score' => (float) $ranking->average_score,
                    'average_score_with_risk' => (float) $ranking->average_score_with_risk,
                    'total_quizzes' => (int) $ranking->total_quizzes_completed,
                    'last_updated' => $ranking->last_updated
                ];
            }

            $this->log_info('Rankings retrieved', [
                'course_id' => $course_id,
                'ranking_count' => count($enriched_rankings)
            ]);

            return $this->success_response([
                'course_id' => $course_id,
                'rankings' => $enriched_rankings
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in get_course_rankings', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                __('An unexpected error occurred. Please try again.', 'quiz-extended'),
                500
            );
        }
    }
}

// Initialize
new QE_Feedback_Rankings_API();