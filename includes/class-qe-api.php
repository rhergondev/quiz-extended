<?php
/**
 * QE_API Class - REFACTORED VERSION
 *
 * Handles all custom REST API endpoints for the Quiz Extended plugin.
 * Implements proper validation, sanitization, error handling, and logging.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    2.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_API
{
    /**
     * API namespace for all custom endpoints
     * 
     * @var string
     */
    protected $namespace = 'quiz-extended/v1';

    /**
     * Constructor - Register hooks
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Register all custom REST API routes
     *
     * @since 1.0.0
     * @return void
     */
    public function register_routes()
    {
        // Quiz Attempts Endpoints
        $this->register_route(
            '/quiz-attempts/start',
            WP_REST_Server::CREATABLE,
            'start_quiz_attempt',
            'user_is_logged_in'
        );

        $this->register_route(
            '/quiz-attempts/submit',
            WP_REST_Server::CREATABLE,
            'submit_quiz_attempt',
            'user_can_submit_quiz'
        );

        // Student Progress Endpoints
        $this->register_route(
            '/student-progress/mark-complete',
            WP_REST_Server::CREATABLE,
            'mark_content_complete',
            'user_is_logged_in'
        );

        // Favorite Questions Endpoints
        $this->register_route(
            '/favorite-questions/toggle',
            WP_REST_Server::CREATABLE,
            'toggle_favorite_question',
            'user_is_logged_in'
        );

        // Question Feedback Endpoints
        $this->register_route(
            '/question-feedback/submit',
            WP_REST_Server::CREATABLE,
            'submit_question_feedback',
            'user_is_logged_in'
        );

        // Rankings Endpoints
        $this->register_route(
            '/rankings/(?P<course_id>\d+)',
            WP_REST_Server::READABLE,
            'get_course_rankings',
            'user_is_logged_in'
        );
    }

    // ============================================================
    // QUIZ ATTEMPTS ENDPOINTS
    // ============================================================

    /**
     * Start a new quiz attempt for the current user
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response object or error
     * @since 1.0.0
     */
    public function start_quiz_attempt(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            // Get and validate quiz_id parameter
            $quiz_id = $request->get_param('quiz_id');

            if (empty($quiz_id) || !is_numeric($quiz_id)) {
                return $this->error_response(
                    'invalid_quiz_id',
                    'Quiz ID is required and must be a valid number.',
                    400
                );
            }

            // Sanitize quiz_id
            $quiz_id = absint($quiz_id);

            // Verify quiz exists and is of correct post type
            $quiz = get_post($quiz_id);

            if (!$quiz || $quiz->post_type !== 'quiz') {
                return $this->error_response(
                    'quiz_not_found',
                    'The requested quiz does not exist.',
                    404
                );
            }

            // Check if quiz is published
            if ($quiz->post_status !== 'publish') {
                return $this->error_response(
                    'quiz_not_available',
                    'This quiz is not currently available.',
                    403
                );
            }

            // Get current user
            $user_id = get_current_user_id();

            // Get course_id from quiz meta
            $course_id = get_post_meta($quiz_id, '_course_id', true);
            $course_id = absint($course_id);

            // Check max attempts limit
            $max_attempts = get_post_meta($quiz_id, '_max_attempts', true);

            if (!empty($max_attempts) && is_numeric($max_attempts)) {
                $max_attempts = absint($max_attempts);
                $table_name = $wpdb->prefix . 'qe_quiz_attempts';

                $attempt_count = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$table_name} 
                     WHERE user_id = %d AND quiz_id = %d AND status = 'completed'",
                    $user_id,
                    $quiz_id
                ));

                if ($attempt_count >= $max_attempts) {
                    return $this->error_response(
                        'max_attempts_reached',
                        sprintf(
                            'You have reached the maximum number of attempts (%d) for this quiz.',
                            $max_attempts
                        ),
                        403
                    );
                }
            }

            // Create new attempt record
            $table_name = $wpdb->prefix . 'qe_quiz_attempts';

            $insert_result = $wpdb->insert(
                $table_name,
                [
                    'user_id' => $user_id,
                    'quiz_id' => $quiz_id,
                    'course_id' => $course_id,
                    'start_time' => current_time('mysql', 1),
                    'status' => 'in-progress',
                ],
                ['%d', '%d', '%d', '%s', '%s']
            );

            if ($insert_result === false) {
                $this->log_error('Failed to create quiz attempt', [
                    'user_id' => $user_id,
                    'quiz_id' => $quiz_id,
                    'db_error' => $wpdb->last_error
                ]);

                return $this->error_response(
                    'db_error',
                    'Could not create quiz attempt. Please try again.',
                    500
                );
            }

            $attempt_id = $wpdb->insert_id;

            // Get questions for this quiz
            $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

            if (empty($question_ids) || !is_array($question_ids)) {
                return $this->error_response(
                    'no_questions',
                    'This quiz has no questions assigned.',
                    404
                );
            }

            // Should we randomize questions?
            $randomize = get_post_meta($quiz_id, '_randomize_questions', true);

            // Support both boolean and legacy 'yes'/'no' format
            if ($randomize === true || $randomize === 'yes' || $randomize === 1 || $randomize === '1') {
                shuffle($question_ids);
            }

            // Prepare questions for student (without correct answers)
            $questions_for_student = [];

            foreach ($question_ids as $question_id) {
                $question_post = get_post($question_id);

                if (!$question_post) {
                    continue;
                }

                $options = get_post_meta($question_id, '_question_options', true);
                $formatted_options = [];

                if (is_array($options)) {
                    foreach ($options as $key => $option_data) {
                        // Don't send isCorrect flag to frontend
                        $formatted_options[] = [
                            'id' => $key,
                            'text' => sanitize_text_field($option_data['text'] ?? '')
                        ];
                    }
                }

                $questions_for_student[] = [
                    'id' => $question_post->ID,
                    'title' => sanitize_text_field($question_post->post_title),
                    'content' => wp_kses_post($question_post->post_content),
                    'type' => sanitize_text_field(
                        get_post_meta($question_id, '_question_type', true)
                    ),
                    'options' => $formatted_options,
                    'points' => absint(
                        get_post_meta($question_id, '_points', true) ?: 1
                    )
                ];
            }

            // Get quiz settings
            $time_limit = get_post_meta($quiz_id, '_time_limit', true);
            $quiz_instructions = get_post_meta($quiz_id, '_quiz_instructions', true);

            $this->log_info('Quiz attempt started successfully', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'quiz_id' => $quiz_id,
                'question_count' => count($questions_for_student)
            ]);

            return new WP_REST_Response([
                'success' => true,
                'attempt_id' => $attempt_id,
                'quiz' => [
                    'id' => $quiz_id,
                    'title' => sanitize_text_field($quiz->post_title),
                    'instructions' => wp_kses_post($quiz_instructions),
                    'time_limit' => $time_limit ? absint($time_limit) : null,
                ],
                'questions' => $questions_for_student
            ], 200);

        } catch (Exception $e) {
            $this->log_error('Exception in start_quiz_attempt', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                'An unexpected error occurred. Please try again.',
                500
            );
        }
    }

    /**
     * Submit quiz attempt and calculate score
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response object or error
     * @since 1.0.0
     */
    public function submit_quiz_attempt(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            // Validate attempt_id
            $attempt_id = $request->get_param('attempt_id');

            if (empty($attempt_id) || !is_numeric($attempt_id)) {
                return $this->error_response(
                    'invalid_attempt_id',
                    'Attempt ID is required and must be a valid number.',
                    400
                );
            }

            $attempt_id = absint($attempt_id);

            // Validate answers
            $answers = $request->get_param('answers');

            if (empty($answers) || !is_array($answers)) {
                return $this->error_response(
                    'invalid_answers',
                    'Answers are required and must be an array.',
                    400
                );
            }

            // Get attempt from database
            $table_name = $wpdb->prefix . 'qe_quiz_attempts';

            $attempt = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE attempt_id = %d",
                $attempt_id
            ));

            if (!$attempt) {
                return $this->error_response(
                    'attempt_not_found',
                    'Quiz attempt not found.',
                    404
                );
            }

            // Check if already completed
            if ($attempt->status === 'completed') {
                return $this->error_response(
                    'already_submitted',
                    'This quiz attempt has already been submitted.',
                    400
                );
            }

            // Calculate scores
            $total_questions = count($answers);
            $correct_answers = 0;
            $correct_with_risk = 0;
            $incorrect_with_risk = 0;
            $total_points = 0;
            $earned_points = 0;

            $answers_table = $wpdb->prefix . 'qe_attempt_answers';
            $enable_negative_scoring = get_post_meta(
                $attempt->quiz_id,
                '_enable_negative_scoring',
                true
            );

            foreach ($answers as $answer) {
                // Validate answer structure
                if (!isset($answer['question_id']) || !isset($answer['answer_given'])) {
                    continue;
                }

                $question_id = absint($answer['question_id']);
                $answer_given = sanitize_text_field($answer['answer_given']);
                $is_risked = isset($answer['is_risked']) && $answer['is_risked'] === true;

                // Get correct answer(s)
                $options = get_post_meta($question_id, '_question_options', true);
                $is_correct = false;

                if (is_array($options)) {
                    foreach ($options as $key => $option) {
                        if ($key == $answer_given && isset($option['isCorrect']) && $option['isCorrect']) {
                            $is_correct = true;
                            break;
                        }
                    }
                }

                // Calculate points
                $points = absint(get_post_meta($question_id, '_points', true) ?: 1);
                $points_incorrect = absint(get_post_meta($question_id, '_points_incorrect', true) ?: 0);

                $total_points += $points;

                if ($is_correct) {
                    $correct_answers++;
                    $earned_points += $points;

                    if ($is_risked) {
                        $correct_with_risk++;
                    }
                } else {
                    if ($is_risked) {
                        $incorrect_with_risk++;
                    }

                    if ($enable_negative_scoring && $points_incorrect > 0) {
                        $earned_points -= $points_incorrect;
                    }
                }

                // Insert answer record
                $wpdb->insert(
                    $answers_table,
                    [
                        'attempt_id' => $attempt_id,
                        'question_id' => $question_id,
                        'answer_given' => $answer_given,
                        'is_correct' => $is_correct ? 1 : 0,
                        'is_risked' => $is_risked ? 1 : 0,
                    ],
                    ['%d', '%d', '%s', '%d', '%d']
                );
            }

            // Calculate final scores
            $score = $total_points > 0
                ? round(($earned_points / $total_points) * 100, 2)
                : 0;

            // Calculate risk-adjusted score
            $risk_bonus = ($correct_with_risk * 5) - ($incorrect_with_risk * 10);
            $score_with_risk = max(0, min(100, $score + $risk_bonus));

            // Update attempt
            $wpdb->update(
                $table_name,
                [
                    'end_time' => current_time('mysql', 1),
                    'score' => $score,
                    'score_with_risk' => $score_with_risk,
                    'status' => 'completed',
                ],
                ['attempt_id' => $attempt_id],
                ['%s', '%f', '%f', '%s'],
                ['%d']
            );

            // Update rankings
            $this->update_user_ranking(
                $attempt->user_id,
                $attempt->course_id,
                $score,
                $score_with_risk
            );

            $this->log_info('Quiz attempt submitted successfully', [
                'attempt_id' => $attempt_id,
                'user_id' => $attempt->user_id,
                'quiz_id' => $attempt->quiz_id,
                'score' => $score,
                'score_with_risk' => $score_with_risk
            ]);

            return new WP_REST_Response([
                'success' => true,
                'results' => [
                    'attempt_id' => $attempt_id,
                    'score' => $score,
                    'score_with_risk' => $score_with_risk,
                    'total_questions' => $total_questions,
                    'correct_answers' => $correct_answers,
                    'total_points' => $total_points,
                    'earned_points' => max(0, $earned_points),
                    'passed' => $this->check_quiz_passed($attempt->quiz_id, $score)
                ]
            ], 200);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_quiz_attempt', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                'An unexpected error occurred. Please try again.',
                500
            );
        }
    }

    // ============================================================
    // STUDENT PROGRESS ENDPOINTS
    // ============================================================

    /**
     * Mark content as complete for the current user
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response object or error
     * @since 1.0.0
     */
    public function mark_content_complete(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            $user_id = get_current_user_id();
            $content_id = absint($request->get_param('content_id'));
            $content_type = sanitize_text_field($request->get_param('content_type'));
            $course_id = absint($request->get_param('course_id'));

            // Validate inputs
            if (empty($content_id) || empty($content_type) || empty($course_id)) {
                return $this->error_response(
                    'missing_parameters',
                    'Content ID, content type, and course ID are required.',
                    400
                );
            }

            // Validate content type
            $valid_types = ['lesson', 'quiz', 'video', 'document'];

            if (!in_array($content_type, $valid_types)) {
                return $this->error_response(
                    'invalid_content_type',
                    sprintf(
                        'Invalid content type. Must be one of: %s',
                        implode(', ', $valid_types)
                    ),
                    400
                );
            }

            $table_name = $wpdb->prefix . 'qe_student_progress';

            // Check if record exists
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT progress_id FROM {$table_name} 
                 WHERE user_id = %d AND content_id = %d",
                $user_id,
                $content_id
            ));

            if ($existing) {
                // Update existing record
                $wpdb->update(
                    $table_name,
                    [
                        'status' => 'completed',
                        'last_viewed' => current_time('mysql', 1)
                    ],
                    [
                        'progress_id' => $existing
                    ],
                    ['%s', '%s'],
                    ['%d']
                );
            } else {
                // Insert new record
                $wpdb->insert(
                    $table_name,
                    [
                        'user_id' => $user_id,
                        'course_id' => $course_id,
                        'content_id' => $content_id,
                        'content_type' => $content_type,
                        'status' => 'completed',
                        'last_viewed' => current_time('mysql', 1)
                    ],
                    ['%d', '%d', '%d', '%s', '%s', '%s']
                );
            }

            // Calculate course progress
            $progress_percentage = $this->calculate_course_progress($user_id, $course_id);

            // Update user meta
            update_user_meta($user_id, "_course_{$course_id}_progress", $progress_percentage);
            update_user_meta($user_id, "_course_{$course_id}_last_activity", current_time('mysql'));

            $this->log_info('Content marked as complete', [
                'user_id' => $user_id,
                'content_id' => $content_id,
                'content_type' => $content_type,
                'course_id' => $course_id,
                'progress' => $progress_percentage
            ]);

            return new WP_REST_Response([
                'success' => true,
                'progress' => $progress_percentage
            ], 200);

        } catch (Exception $e) {
            $this->log_error('Exception in mark_content_complete', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                'An unexpected error occurred. Please try again.',
                500
            );
        }
    }

    // ============================================================
    // FAVORITE QUESTIONS ENDPOINTS
    // ============================================================

    /**
     * Toggle favorite status for a question
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response object or error
     * @since 1.0.0
     */
    public function toggle_favorite_question(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            $user_id = get_current_user_id();
            $question_id = absint($request->get_param('question_id'));

            if (empty($question_id)) {
                return $this->error_response(
                    'invalid_question_id',
                    'Question ID is required.',
                    400
                );
            }

            // Verify question exists
            $question = get_post($question_id);

            if (!$question || $question->post_type !== 'question') {
                return $this->error_response(
                    'question_not_found',
                    'Question not found.',
                    404
                );
            }

            $table_name = $wpdb->prefix . 'qe_favorite_questions';

            // Check if already favorited
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT favorite_id FROM {$table_name} 
                 WHERE user_id = %d AND question_id = %d",
                $user_id,
                $question_id
            ));

            if ($existing) {
                // Remove from favorites
                $wpdb->delete(
                    $table_name,
                    ['favorite_id' => $existing],
                    ['%d']
                );

                $is_favorited = false;
            } else {
                // Add to favorites
                $wpdb->insert(
                    $table_name,
                    [
                        'user_id' => $user_id,
                        'question_id' => $question_id,
                        'date_added' => current_time('mysql')
                    ],
                    ['%d', '%d', '%s']
                );

                $is_favorited = true;
            }

            $this->log_info('Favorite question toggled', [
                'user_id' => $user_id,
                'question_id' => $question_id,
                'is_favorited' => $is_favorited
            ]);

            return new WP_REST_Response([
                'success' => true,
                'is_favorited' => $is_favorited
            ], 200);

        } catch (Exception $e) {
            $this->log_error('Exception in toggle_favorite_question', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                'An unexpected error occurred. Please try again.',
                500
            );
        }
    }

    // ============================================================
    // QUESTION FEEDBACK ENDPOINTS
    // ============================================================

    /**
     * Submit feedback/challenge for a question
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response object or error
     * @since 1.0.0
     */
    public function submit_question_feedback(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            $user_id = get_current_user_id();
            $question_id = absint($request->get_param('question_id'));
            $feedback_type = sanitize_text_field($request->get_param('feedback_type'));
            $message = sanitize_textarea_field($request->get_param('message'));

            // Validate inputs
            if (empty($question_id) || empty($feedback_type) || empty($message)) {
                return $this->error_response(
                    'missing_parameters',
                    'Question ID, feedback type, and message are required.',
                    400
                );
            }

            // Validate feedback type
            $valid_types = ['doubt', 'challenge', 'suggestion', 'error'];

            if (!in_array($feedback_type, $valid_types)) {
                return $this->error_response(
                    'invalid_feedback_type',
                    sprintf(
                        'Invalid feedback type. Must be one of: %s',
                        implode(', ', $valid_types)
                    ),
                    400
                );
            }

            // Verify question exists
            $question = get_post($question_id);

            if (!$question || $question->post_type !== 'question') {
                return $this->error_response(
                    'question_not_found',
                    'Question not found.',
                    404
                );
            }

            $table_name = $wpdb->prefix . 'qe_question_feedback';

            $wpdb->insert(
                $table_name,
                [
                    'question_id' => $question_id,
                    'user_id' => $user_id,
                    'feedback_type' => $feedback_type,
                    'message' => $message,
                    'status' => 'unresolved',
                    'date_submitted' => current_time('mysql')
                ],
                ['%d', '%d', '%s', '%s', '%s', '%s']
            );

            $feedback_id = $wpdb->insert_id;

            $this->log_info('Question feedback submitted', [
                'feedback_id' => $feedback_id,
                'user_id' => $user_id,
                'question_id' => $question_id,
                'feedback_type' => $feedback_type
            ]);

            return new WP_REST_Response([
                'success' => true,
                'feedback_id' => $feedback_id
            ], 200);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_question_feedback', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                'An unexpected error occurred. Please try again.',
                500
            );
        }
    }

    // ============================================================
    // RANKINGS ENDPOINTS
    // ============================================================

    /**
     * Get rankings for a specific course
     *
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response object or error
     * @since 1.0.0
     */
    public function get_course_rankings(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            $course_id = absint($request['course_id']);

            if (empty($course_id)) {
                return $this->error_response(
                    'invalid_course_id',
                    'Course ID is required.',
                    400
                );
            }

            // Verify course exists
            $course = get_post($course_id);

            if (!$course || $course->post_type !== 'course') {
                return $this->error_response(
                    'course_not_found',
                    'Course not found.',
                    404
                );
            }

            $table_name = $wpdb->prefix . 'qe_rankings';

            $rankings = $wpdb->get_results($wpdb->prepare(
                "SELECT user_id, average_score, average_score_with_risk, 
                        total_quizzes_completed, is_fake_user, last_updated
                 FROM {$table_name} 
                 WHERE course_id = %d 
                 ORDER BY average_score_with_risk DESC 
                 LIMIT 100",
                $course_id
            ));

            // Enrich with user data
            $enriched_rankings = [];
            $position = 1;

            foreach ($rankings as $ranking) {
                $user = get_userdata($ranking->user_id);

                if ($user) {
                    $enriched_rankings[] = [
                        'position' => $position++,
                        'user_id' => $ranking->user_id,
                        'user_name' => $ranking->is_fake_user
                            ? sanitize_text_field($user->display_name)
                            : 'Anonymous User',
                        'avatar_url' => get_avatar_url($ranking->user_id),
                        'average_score' => floatval($ranking->average_score),
                        'average_score_with_risk' => floatval($ranking->average_score_with_risk),
                        'total_quizzes' => intval($ranking->total_quizzes_completed),
                        'last_updated' => $ranking->last_updated
                    ];
                }
            }

            $this->log_info('Rankings retrieved', [
                'course_id' => $course_id,
                'ranking_count' => count($enriched_rankings)
            ]);

            return new WP_REST_Response([
                'success' => true,
                'course_id' => $course_id,
                'rankings' => $enriched_rankings
            ], 200);

        } catch (Exception $e) {
            $this->log_error('Exception in get_course_rankings', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error_response(
                'internal_error',
                'An unexpected error occurred. Please try again.',
                500
            );
        }
    }

    // ============================================================
    // PERMISSION CALLBACKS
    // ============================================================

    /**
     * Check if user is logged in
     *
     * @return bool|WP_Error True if logged in, WP_Error otherwise
     * @since 1.0.0
     */
    public function user_is_logged_in()
    {
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_forbidden',
                'You must be logged in to perform this action.',
                ['status' => 401]
            );
        }

        return true;
    }

    /**
     * Check if user can submit a specific quiz attempt
     *
     * @param WP_REST_Request $request The request object
     * @return bool|WP_Error True if allowed, WP_Error otherwise
     * @since 1.0.0
     */
    public function user_can_submit_quiz(WP_REST_Request $request)
    {
        try {
            global $wpdb;

            // First check if logged in
            $logged_in_check = $this->user_is_logged_in();

            if (is_wp_error($logged_in_check)) {
                return $logged_in_check;
            }

            $attempt_id = absint($request->get_param('attempt_id'));

            if (empty($attempt_id)) {
                return new WP_Error(
                    'invalid_attempt_id',
                    'Attempt ID is required.',
                    ['status' => 400]
                );
            }

            $table_name = $wpdb->prefix . 'qe_quiz_attempts';

            $attempt_user_id = $wpdb->get_var($wpdb->prepare(
                "SELECT user_id FROM {$table_name} WHERE attempt_id = %d",
                $attempt_id
            ));

            if ($attempt_user_id === null) {
                return new WP_Error(
                    'attempt_not_found',
                    'Quiz attempt not found.',
                    ['status' => 404]
                );
            }

            if (get_current_user_id() != $attempt_user_id) {
                return new WP_Error(
                    'rest_forbidden',
                    'You cannot submit this quiz attempt.',
                    ['status' => 403]
                );
            }

            return true;

        } catch (Exception $e) {
            $this->log_error('Exception in user_can_submit_quiz', [
                'message' => $e->getMessage()
            ]);

            return new WP_Error(
                'internal_error',
                'An error occurred while checking permissions.',
                ['status' => 500]
            );
        }
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Register a single REST route with error handling
     *
     * @param string $endpoint The endpoint URL
     * @param string $methods HTTP methods (GET, POST, etc.)
     * @param string $callback Callback method name
     * @param string $permission_callback Permission callback method name
     * @return void
     * @since 1.0.0
     */
    private function register_route($endpoint, $methods, $callback, $permission_callback)
    {
        register_rest_route($this->namespace, $endpoint, [
            'methods' => $methods,
            'callback' => [$this, $callback],
            'permission_callback' => [$this, $permission_callback],
        ]);
    }

    /**
     * Update user ranking after quiz completion
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @param float $score Standard score
     * @param float $score_with_risk Risk-adjusted score
     * @return void
     * @since 1.0.0
     */
    private function update_user_ranking($user_id, $course_id, $score, $score_with_risk)
    {
        try {
            global $wpdb;

            $table_name = $wpdb->prefix . 'qe_rankings';
            $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

            // Get user's completed attempts for this course
            $attempts = $wpdb->get_results($wpdb->prepare(
                "SELECT score, score_with_risk 
                 FROM {$attempts_table} 
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'",
                $user_id,
                $course_id
            ));

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
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT ranking_id FROM {$table_name} 
                 WHERE user_id = %d AND course_id = %d",
                $user_id,
                $course_id
            ));

            if ($existing) {
                // Update existing ranking
                $wpdb->update(
                    $table_name,
                    [
                        'average_score' => $average_score,
                        'average_score_with_risk' => $average_score_with_risk,
                        'total_quizzes_completed' => $count,
                        'last_updated' => current_time('mysql', 1)
                    ],
                    ['ranking_id' => $existing],
                    ['%f', '%f', '%d', '%s'],
                    ['%d']
                );
            } else {
                // Insert new ranking
                $wpdb->insert(
                    $table_name,
                    [
                        'user_id' => $user_id,
                        'course_id' => $course_id,
                        'average_score' => $average_score,
                        'average_score_with_risk' => $average_score_with_risk,
                        'total_quizzes_completed' => $count,
                        'is_fake_user' => false,
                        'last_updated' => current_time('mysql', 1)
                    ],
                    ['%d', '%d', '%f', '%f', '%d', '%d', '%s']
                );
            }

            $this->log_info('User ranking updated', [
                'user_id' => $user_id,
                'course_id' => $course_id,
                'average_score' => $average_score,
                'average_score_with_risk' => $average_score_with_risk
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in update_user_ranking', [
                'message' => $e->getMessage(),
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);
        }
    }

    /**
     * Calculate course progress percentage for a user
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return float Progress percentage (0-100)
     * @since 1.0.0
     */
    private function calculate_course_progress($user_id, $course_id)
    {
        try {
            global $wpdb;

            // Get total content items in course
            $total_lessons = get_posts([
                'post_type' => 'lesson',
                'meta_key' => '_course_id',
                'meta_value' => $course_id,
                'posts_per_page' => -1,
                'fields' => 'ids'
            ]);

            $total_quizzes = get_posts([
                'post_type' => 'quiz',
                'meta_key' => '_course_id',
                'meta_value' => $course_id,
                'posts_per_page' => -1,
                'fields' => 'ids'
            ]);

            $total_items = count($total_lessons) + count($total_quizzes);

            if ($total_items === 0) {
                return 0;
            }

            // Get completed items
            $table_name = $wpdb->prefix . 'qe_student_progress';

            $completed_count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table_name} 
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'",
                $user_id,
                $course_id
            ));

            return round(($completed_count / $total_items) * 100, 2);

        } catch (Exception $e) {
            $this->log_error('Exception in calculate_course_progress', [
                'message' => $e->getMessage(),
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);

            return 0;
        }
    }

    /**
     * Check if quiz was passed based on passing score
     *
     * @param int $quiz_id Quiz ID
     * @param float $score User's score
     * @return bool True if passed, false otherwise
     * @since 1.0.0
     */
    private function check_quiz_passed($quiz_id, $score)
    {
        $passing_score = get_post_meta($quiz_id, '_passing_score', true);

        if (empty($passing_score)) {
            $passing_score = 50; // Default passing score
        }

        return floatval($score) >= floatval($passing_score);
    }

    /**
     * Create standardized error response
     *
     * @param string $code Error code
     * @param string $message Error message
     * @param int $status HTTP status code
     * @return WP_Error Error object
     * @since 1.0.0
     */
    private function error_response($code, $message, $status = 400)
    {
        return new WP_Error(
            $code,
            $message,
            ['status' => $status]
        );
    }

    /**
     * Log error message with context
     *
     * @param string $message Error message
     * @param array $context Additional context data
     * @return void
     * @since 1.0.0
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended API ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info message with context
     *
     * @param string $message Info message
     * @param array $context Additional context data
     * @return void
     * @since 1.0.0
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended API INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}

// Initialize the API
new QE_API();