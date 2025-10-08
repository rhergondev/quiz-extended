<?php
/**
 * QE_Quiz_Attempts_API Class
 *
 * Handles quiz attempt endpoints: starting and submitting quiz attempts.
 * Includes full validation, scoring, and ranking updates.
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

class QE_Quiz_Attempts_API extends QE_API_Base
{
    /**
     * Register routes
     */
    public function register_routes()
    {
        // Start quiz attempt
        $this->register_secure_route(
            '/quiz-attempts/start',
            WP_REST_Server::CREATABLE,
            'start_quiz_attempt',
            [
                'validation_schema' => [
                    'quiz_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => 'Quiz ID to start'
                    ]
                ]
            ]
        );

        // Submit quiz attempt
        $this->register_secure_route(
            '/quiz-attempts/submit',
            WP_REST_Server::CREATABLE,
            'submit_quiz_attempt',
            [
                'permission_callback' => [$this, 'check_submit_permission'],
                'validation_schema' => [
                    'attempt_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => 'Attempt ID to submit'
                    ],
                    'answers' => [
                        'required' => true,
                        'type' => 'array',
                        'description' => 'Array of answers',
                        'items' => [
                            'type' => 'object'
                        ]
                    ]
                ]
            ]
        );
    }

    // ============================================================
    // START QUIZ ATTEMPT
    // ============================================================

    /**
     * Start a new quiz attempt
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function start_quiz_attempt(WP_REST_Request $request)
    {
        try {
            $quiz_id = $request->get_param('quiz_id');
            $user_id = get_current_user_id();

            // Log API call
            $this->log_api_call('/quiz-attempts/start', [
                'quiz_id' => $quiz_id,
                'user_id' => $user_id
            ]);

            // Validate quiz
            $quiz = $this->validate_post($quiz_id, 'quiz');
            if (is_wp_error($quiz)) {
                return $quiz;
            }

            // Check if quiz is published
            if ($quiz->post_status !== 'publish') {
                return $this->error_response(
                    'quiz_not_available',
                    __('This quiz is not currently available.', 'quiz-extended'),
                    403
                );
            }

            // Check if user can take this quiz
            if (!$this->auth->can_take_quiz($quiz_id)) {
                return $this->error_response(
                    'quiz_access_denied',
                    __('You do not have permission to take this quiz.', 'quiz-extended'),
                    403
                );
            }

            // Get course ID
            $course_id = get_post_meta($quiz_id, '_course_id', true);
            $course_id = absint($course_id);

            // Check max attempts
            $max_attempts_check = $this->check_max_attempts($user_id, $quiz_id);
            if (is_wp_error($max_attempts_check)) {
                return $max_attempts_check;
            }

            // Create attempt record
            $attempt_id = $this->create_attempt_record($user_id, $quiz_id, $course_id);
            if (!$attempt_id) {
                return $this->error_response(
                    'db_error',
                    __('Could not create quiz attempt. Please try again.', 'quiz-extended'),
                    500
                );
            }

            // Get questions for this attempt
            $questions = $this->prepare_quiz_questions($quiz_id);
            if (is_wp_error($questions)) {
                return $questions;
            }

            // Get quiz settings
            $quiz_settings = $this->get_quiz_settings($quiz_id);

            // Fire action hook
            do_action('qe_quiz_attempt_started', $user_id, $quiz_id, $attempt_id);

            // Log success
            $this->log_info('Quiz attempt started successfully', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'quiz_id' => $quiz_id,
                'question_count' => count($questions)
            ]);

            return $this->success_response([
                'attempt_id' => $attempt_id,
                'quiz' => [
                    'id' => $quiz_id,
                    'title' => $quiz->post_title,
                    'instructions' => $quiz_settings['instructions'],
                    'time_limit' => $quiz_settings['time_limit'],
                    'randomize_questions' => $quiz_settings['randomize'],
                ],
                'questions' => $questions
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in start_quiz_attempt', [
                'message' => $e->getMessage(),
            ]);

            return $this->error_response(
                'internal_error',
                __('An unexpected error occurred. Please try again.', 'quiz-extended'),
                500
            );
        }
    }

    // ============================================================
    // SUBMIT QUIZ ATTEMPT
    // ============================================================

    /**
     * Submit quiz attempt and calculate score
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function submit_quiz_attempt(WP_REST_Request $request)
    {
        try {
            $attempt_id = $request->get_param('attempt_id');
            $answers = $request->get_param('answers');
            $user_id = get_current_user_id();

            // Log API call
            $this->log_api_call('/quiz-attempts/submit', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'answer_count' => count($answers)
            ]);

            // Get attempt
            $attempt = $this->get_attempt($attempt_id);
            if (is_wp_error($attempt)) {
                return $attempt;
            }

            // Check if already completed
            if ($attempt->status === 'completed') {
                return $this->error_response(
                    'already_submitted',
                    __('This quiz attempt has already been submitted.', 'quiz-extended'),
                    400
                );
            }

            $this->get_db()->query('START TRANSACTION');

            // Grade the attempt
            try {
                // Grade the attempt
                $grading_result = $this->grade_attempt($attempt, $answers);
                if (is_wp_error($grading_result)) {
                    // AÑADIDO: Revertir si hay error
                    $this->get_db()->query('ROLLBACK');
                    return $grading_result;
                }

                // Update attempt record
                $update_result = $this->complete_attempt($attempt_id, $grading_result);
                if (!$update_result) {
                    $this->get_db()->query('ROLLBACK');
                    return $this->error_response(
                        'db_error',
                        __('Could not update quiz attempt. Please try again.', 'quiz-extended'),
                        500
                    );
                }

                $this->get_db()->query('COMMIT');

            } catch (Exception $e) {
                $this->get_db()->query('ROLLBACK');
                $this->log_error('Exception during attempt submission transaction', [
                    'message' => $e->getMessage(),
                    'attempt_id' => $attempt_id,
                ]);
                return $this->error_response(
                    'internal_error',
                    __('An unexpected error occurred while saving the attempt.', 'quiz-extended'),
                    500
                );
            }

            // Update rankings
            $this->update_rankings($attempt->user_id, $attempt->course_id, $grading_result);

            // Fire action hook
            do_action('qe_quiz_attempt_submitted', $user_id, $attempt->quiz_id, $grading_result);

            // Log success
            $this->log_info('Quiz attempt submitted successfully', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'quiz_id' => $attempt->quiz_id,
                'score' => $grading_result['score'],
                'passed' => $grading_result['passed']
            ]);

            return $this->success_response([
                'attempt_id' => $attempt_id,
                'score' => $grading_result['score'],
                'score_with_risk' => $grading_result['score_with_risk'],
                'total_questions' => $grading_result['total_questions'],
                'correct_answers' => $grading_result['correct_answers'],
                'total_points' => $grading_result['total_points'],
                'earned_points' => $grading_result['earned_points'],
                'passed' => $grading_result['passed']
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_quiz_attempt', [
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
    // PERMISSION CALLBACKS
    // ============================================================

    /**
     * Check if user can submit this quiz attempt
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if allowed
     */
    public function check_submit_permission(WP_REST_Request $request)
    {
        // First check base permissions
        $base_check = parent::check_permissions($request);
        if (is_wp_error($base_check)) {
            return $base_check;
        }

        $attempt_id = $request->get_param('attempt_id');
        $user_id = get_current_user_id();

        // Get attempt owner
        $attempt_user_id = $this->db_get_var(
            "SELECT user_id FROM {$this->get_table('quiz_attempts')} WHERE attempt_id = %d",
            [$attempt_id]
        );

        if ($attempt_user_id === null) {
            return new WP_Error(
                'attempt_not_found',
                __('Quiz attempt not found.', 'quiz-extended'),
                ['status' => 404]
            );
        }

        // Check ownership
        if ((int) $attempt_user_id !== $user_id) {
            $this->audit_log->log_security_event('unauthorized_quiz_submit', [
                'user_id' => $user_id,
                'attempt_id' => $attempt_id,
                'attempt_owner' => $attempt_user_id
            ]);

            return new WP_Error(
                'rest_forbidden',
                __('You cannot submit this quiz attempt.', 'quiz-extended'),
                ['status' => 403]
            );
        }

        return true;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Check max attempts limit
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @return bool|WP_Error True if allowed, error otherwise
     */
    private function check_max_attempts($user_id, $quiz_id)
    {
        $max_attempts = get_post_meta($quiz_id, '_max_attempts', true);

        if ($max_attempts === '' || !is_numeric($max_attempts) || absint($max_attempts) === 0) {
            return true; // No limit
        }

        $max_attempts = absint($max_attempts);

        // Count completed attempts
        $attempt_count = $this->db_get_var(
            "SELECT COUNT(*) FROM {$this->get_table('quiz_attempts')} 
             WHERE user_id = %d AND quiz_id = %d AND status = 'completed'",
            [$user_id, $quiz_id]
        );

        if ($attempt_count >= $max_attempts) {
            return $this->error_response(
                'max_attempts_reached',
                sprintf(
                    __('You have reached the maximum number of attempts (%d) for this quiz.', 'quiz-extended'),
                    $max_attempts
                ),
                403
            );
        }

        return true;
    }

    /**
     * Create attempt record
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @param int $course_id Course ID
     * @return int|false Attempt ID or false
     */
    private function create_attempt_record($user_id, $quiz_id, $course_id)
    {
        return $this->db_insert('quiz_attempts', [
            'user_id' => $user_id,
            'quiz_id' => $quiz_id,
            'course_id' => $course_id,
            'start_time' => $this->get_mysql_timestamp(),
            'status' => 'in-progress'
        ], ['%d', '%d', '%d', '%s', '%s']);
    }

    /**
     * Prepare quiz questions
     *
     * @param int $quiz_id Quiz ID
     * @return array|WP_Error Questions array or error
     */
    private function prepare_quiz_questions($quiz_id)
    {
        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

        if (empty($question_ids) || !is_array($question_ids)) {
            return $this->error_response(
                'no_questions',
                __('This quiz has no questions assigned.', 'quiz-extended'),
                404
            );
        }

        // Should we randomize?
        $randomize = get_post_meta($quiz_id, '_randomize_questions', true);
        if ($randomize === 'yes' || $randomize === true) {
            shuffle($question_ids);
        }

        $questions = [];

        foreach ($question_ids as $question_id) {
            $question_post = get_post($question_id);

            if (!$question_post || $question_post->post_type !== 'question') {
                continue;
            }

            $options = get_post_meta($question_id, '_question_options', true);
            $formatted_options = [];

            if (is_array($options)) {
                foreach ($options as $key => $option_data) {
                    // Don't send isCorrect flag to frontend
                    $formatted_options[] = [
                        'id' => $key,
                        'text' => isset($option_data['text']) ? sanitize_text_field($option_data['text']) : ''
                    ];
                }
            }

            $questions[] = [
                'id' => $question_post->ID,
                'title' => $question_post->post_title,
                'content' => $question_post->post_content,
                'type' => get_post_meta($question_id, '_question_type', true),
                'options' => $formatted_options,
                'points' => absint(get_post_meta($question_id, '_points', true) ?: 1)
            ];
        }

        return $questions;
    }

    /**
     * Get quiz settings
     *
     * @param int $quiz_id Quiz ID
     * @return array Quiz settings
     */
    private function get_quiz_settings($quiz_id)
    {
        return [
            'instructions' => get_post_meta($quiz_id, '_quiz_instructions', true),
            'time_limit' => absint(get_post_meta($quiz_id, '_time_limit', true) ?: 0),
            'randomize' => get_post_meta($quiz_id, '_randomize_questions', true) === 'yes'
        ];
    }

    /**
     * Get attempt by ID
     *
     * @param int $attempt_id Attempt ID
     * @return object|WP_Error Attempt object or error
     */
    private function get_attempt($attempt_id)
    {
        $attempt = $this->db_get_row(
            "SELECT * FROM {$this->get_table('quiz_attempts')} WHERE attempt_id = %d",
            [$attempt_id]
        );

        if (!$attempt) {
            return $this->error_response(
                'attempt_not_found',
                __('Quiz attempt not found.', 'quiz-extended'),
                404
            );
        }

        return $attempt;
    }

    /**
     * Grade the attempt
     *
     * @param object $attempt Attempt object
     * @param array $answers Answers array
     * @return array|WP_Error Grading results or error
     */
    private function grade_attempt($attempt, $answers)
    {
        $total_questions = 0;
        $correct_answers = 0;
        $correct_with_risk = 0;
        $incorrect_with_risk = 0;
        $total_points = 0;
        $earned_points = 0;

        $question_ids_in_quiz = get_post_meta($attempt->quiz_id, '_quiz_question_ids', true);
        if (!is_array($question_ids_in_quiz)) {
            $question_ids_in_quiz = [];
        }

        $total_questions = count($question_ids_in_quiz);

        // 1. Calcular el total de puntos de TODAS las preguntas del cuestionario (Este es el único lugar donde debe calcularse)
        foreach ($question_ids_in_quiz as $question_id) {
            $points = absint(get_post_meta($question_id, '_points', true) ?: 1);
            $total_points += $points;
        }

        $enable_negative_scoring = get_post_meta($attempt->quiz_id, '_enable_negative_scoring', true);

        // 2. Iterar sobre las respuestas ENVIADAS para calcular los puntos ganados
        foreach ($answers as $answer) {
            // Validate answer structure
            if (!isset($answer['question_id'])) {
                continue;
            }

            $question_id = absint($answer['question_id']);
            // Permitir respuesta vacía (null), pero validarla si existe
            $answer_given = isset($answer['answer_given']) ? $this->security->validate_string($answer['answer_given'], 255) : null;
            $is_risked = isset($answer['is_risked']) && $answer['is_risked'] === true;

            // Get correct answer
            $options = get_post_meta($question_id, '_question_options', true);
            $is_correct = false;

            if (is_array($options) && $answer_given !== null) {
                foreach ($options as $option) {
                    if (isset($option['id']) && $option['id'] == $answer_given && isset($option['isCorrect']) && $option['isCorrect']) {
                        $is_correct = true;
                        break;
                    }
                }
            }

            // Calculate points
            $points = absint(get_post_meta($question_id, '_points', true) ?: 1);
            $points_incorrect = absint(get_post_meta($question_id, '_points_incorrect', true) ?: 0);

            // 🔥 CORRECCIÓN: Se elimina la línea que sumaba puntos de nuevo al total
            // $total_points += $points; 

            if ($is_correct) {
                $earned_points += $points;
                $correct_answers++;

                if ($is_risked) {
                    $correct_with_risk++;
                }
            } else {
                if ($enable_negative_scoring && $points_incorrect > 0) {
                    $earned_points -= $points_incorrect;
                }

                if ($is_risked) {
                    $incorrect_with_risk++;
                }
            }

            // Store answer
            $this->db_insert('attempt_answers', [
                'attempt_id' => $attempt->attempt_id,
                'question_id' => $question_id,
                'answer_given' => $answer_given,
                'is_correct' => $is_correct ? 1 : 0,
                'is_risked' => $is_risked ? 1 : 0
            ], ['%d', '%d', '%s', '%d', '%d']);
        }

        // Calculate final scores
        $score = $total_points > 0 ? round(($earned_points / $total_points) * 100, 2) : 0;
        $score = max(0, $score); // Asegurar que el score no sea negativo

        // Calculate risk-adjusted score
        $risk_bonus = ($correct_with_risk * 5) - ($incorrect_with_risk * 10);
        $score_with_risk = max(0, min(100, $score + $risk_bonus));

        // Check if passed
        $passing_score = absint(get_post_meta($attempt->quiz_id, '_passing_score', true) ?: 50);
        $passed = $score >= $passing_score;

        return [
            'score' => $score,
            'score_with_risk' => $score_with_risk,
            'total_questions' => $total_questions,
            'correct_answers' => $correct_answers,
            'total_points' => $total_points,
            'earned_points' => max(0, $earned_points),
            'passed' => $passed
        ];
    }

    /**
     * Complete the attempt
     *
     * @param int $attempt_id Attempt ID
     * @param array $grading_result Grading results
     * @return bool Success
     */
    private function complete_attempt($attempt_id, $grading_result)
    {
        return $this->db_update(
            'quiz_attempts',
            [
                'end_time' => $this->get_mysql_timestamp(),
                'score' => $grading_result['score'],
                'score_with_risk' => $grading_result['score_with_risk'],
                'status' => 'completed'
            ],
            ['attempt_id' => $attempt_id],
            ['%s', '%f', '%f', '%s'],
            ['%d']
        );
    }

    /**
     * Update user rankings
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @param array $grading_result Grading results
     * @return void
     */
    private function update_rankings($user_id, $course_id, $grading_result)
    {
        try {
            // Get all completed attempts for this user/course
            $attempts = $this->db_get_results(
                "SELECT score, score_with_risk 
                 FROM {$this->get_table('quiz_attempts')} 
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'",
                [$user_id, $course_id]
            );

            if (empty($attempts)) {
                return;
            }

            // Calculate averages
            $total_score = 0;
            $total_score_with_risk = 0;
            $count = count($attempts);

            foreach ($attempts as $attempt) {
                $total_score += floatval($attempt->score);
                $total_score_with_risk += floatval($attempt->score_with_risk);
            }

            $average_score = $total_score / $count;
            $average_score_with_risk = $total_score_with_risk / $count;

            // Check if ranking exists
            $existing = $this->db_get_var(
                "SELECT ranking_id FROM {$this->get_table('rankings')} 
                 WHERE user_id = %d AND course_id = %d",
                [$user_id, $course_id]
            );

            if ($existing) {
                // Update existing
                $this->db_update(
                    'rankings',
                    [
                        'average_score' => $average_score,
                        'average_score_with_risk' => $average_score_with_risk,
                        'total_quizzes_completed' => $count,
                        'last_updated' => $this->get_mysql_timestamp()
                    ],
                    ['ranking_id' => $existing],
                    ['%f', '%f', '%d', '%s'],
                    ['%d']
                );
            } else {
                // Insert new
                $this->db_insert('rankings', [
                    'user_id' => $user_id,
                    'course_id' => $course_id,
                    'average_score' => $average_score,
                    'average_score_with_risk' => $average_score_with_risk,
                    'total_quizzes_completed' => $count,
                    'is_fake_user' => 0,
                    'last_updated' => $this->get_mysql_timestamp()
                ], ['%d', '%d', '%f', '%f', '%d', '%d', '%s']);
            }

            $this->log_info('User ranking updated', [
                'user_id' => $user_id,
                'course_id' => $course_id,
                'average_score' => $average_score,
                'average_score_with_risk' => $average_score_with_risk
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in update_rankings', [
                'message' => $e->getMessage(),
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);
        }
    }
}

// Initialize
new QE_Quiz_Attempts_API();