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

        $this->register_secure_route(
            '/rankings/quiz/(?P<quiz_id>\d+)/populate',
            WP_REST_Server::CREATABLE,
            'populate_quiz_ranking'
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

        // 1. Get all users ranked by their LATEST attempt (not highest score)
        $all_rankings = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                a.user_id, 
                a.score as score,
                a.score_with_risk as score_with_risk,
                a.end_time as attempt_date, 
                u.display_name, 
                u.user_email
            FROM {$attempts_table} a
            INNER JOIN (
                SELECT user_id, MAX(end_time) as latest_time
                FROM {$attempts_table}
                WHERE quiz_id = %d AND status = 'completed'
                GROUP BY user_id
            ) as latest_attempts ON a.user_id = latest_attempts.user_id AND a.end_time = latest_attempts.latest_time
            INNER JOIN {$wpdb->users} u ON a.user_id = u.ID
            WHERE a.quiz_id = %d AND a.status = 'completed'
            GROUP BY a.user_id
            ORDER BY score_with_risk DESC, a.end_time ASC",
            $quiz_id,
            $quiz_id
        ));

        // 2. Calculate statistics: average scores with and without risk
        $stats = $wpdb->get_row($wpdb->prepare(
            "SELECT 
                AVG(a.score) as avg_score_without_risk,
                AVG(a.score_with_risk) as avg_score_with_risk
            FROM {$attempts_table} a
            INNER JOIN (
                SELECT user_id, MAX(end_time) as latest_time
                FROM {$attempts_table}
                WHERE quiz_id = %d AND status = 'completed'
                GROUP BY user_id
            ) as latest_attempts ON a.user_id = latest_attempts.user_id AND a.end_time = latest_attempts.latest_time
            WHERE a.quiz_id = %d AND a.status = 'completed'",
            $quiz_id,
            $quiz_id
        ));

        $statistics = [
            'avg_score_without_risk' => $stats ? (float) $stats->avg_score_without_risk : 0,
            'avg_score_with_risk' => $stats ? (float) $stats->avg_score_with_risk : 0,
            'total_users' => count($all_rankings)
        ];

        if (empty($all_rankings)) {
            return $this->success_response([
                'top' => [],
                'relative' => [],
                'currentUser' => null,
                'statistics' => $statistics
            ]);
        }

        // 3. Find current user's position
        $current_user_position = -1;
        foreach ($all_rankings as $index => $rank) {
            if ((int) $rank->user_id === $current_user_id) {
                $current_user_position = $index;
                break;
            }
        }

        // 4. Prepare Top 3
        $top_3 = array_slice($all_rankings, 0, 3);
        $top_3_processed = [];
        foreach ($top_3 as $index => $rank) {
            $top_3_processed[] = [
                'position' => $index + 1,
                'user_id' => (int) $rank->user_id,
                'display_name' => $rank->display_name,
                'avatar_url' => get_avatar_url($rank->user_id),
                'score' => (float) $rank->score,
                'score_with_risk' => (float) $rank->score_with_risk,
                'attempt_date' => $rank->attempt_date,
            ];
        }

        // 5. Prepare Relative Ranking
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
                    'score_with_risk' => (float) $rank->score_with_risk,
                    'attempt_date' => $rank->attempt_date,
                ];
            }
        }

        return $this->success_response([
            'top' => $top_3_processed,
            'relative' => $relative_ranking_processed,
            'currentUser' => [
                'id' => $current_user_id,
                'position' => $current_user_position !== -1 ? $current_user_position + 1 : null,
            ],
            'statistics' => $statistics
        ]);
    }

    public function populate_quiz_ranking(WP_REST_Request $request)
    {
        $quiz_id = (int) $request['quiz_id'];
        $users = $request->get_param('users');
        $min_score = (int) $request->get_param('min_score') ?: 70;
        $max_score = (int) $request->get_param('max_score') ?: 100;

        if (empty($users) || !is_array($users)) {
            return $this->error_response('bad_request', 'La lista de usuarios es inválida.', 400);
        }

        global $wpdb;
        $rankings_table = $this->get_table('rankings');
        $inserted_count = 0;

        foreach ($users as $user_data) {
            if (empty($user_data['display_name']))
                continue;

            // Crear un usuario ficticio en WordPress para obtener un ID
            $fake_email = sanitize_title($user_data['display_name']) . '@example.com';
            if (email_exists($fake_email)) {
                $user = get_user_by('email', $fake_email);
                $user_id = $user->ID;
            } else {
                $user_id = wp_create_user(sanitize_title($user_data['display_name']), wp_generate_password(), $fake_email);
                if (is_wp_error($user_id))
                    continue;
                wp_update_user(['ID' => $user_id, 'display_name' => $user_data['display_name']]);
            }

            $score = rand($min_score, $max_score);

            $wpdb->replace(
                $rankings_table,
                [
                    'user_id' => $user_id,
                    'quiz_id' => $quiz_id,
                    'score' => $score,
                    'is_fake_user' => 1,
                ],
                ['%d', '%d', '%d', '%d']
            );
            $inserted_count++;
        }

        return $this->success_response(['message' => "$inserted_count usuarios ficticios añadidos al ranking."]);
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