<?php
/**
 * QE_API Class
 *
 * Registers the custom REST API endpoints for the plugin.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @author     Your Name <you@example.com>
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

class QE_API
{
    protected $namespace = 'quiz-extended/v1';

    public function __construct()
    {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Registers all custom routes for the API.
     */
    public function register_routes()
    {
        // === QUIZ ATTEMPTS ===
        $this->register_route('/quiz-attempts/start', WP_REST_Server::CREATABLE, 'start_quiz_attempt', 'user_is_logged_in');
        $this->register_route('/quiz-attempts/submit', WP_REST_Server::CREATABLE, 'submit_quiz_attempt', 'user_can_submit_quiz');

        // === STUDENT PROGRESS ===
        $this->register_route('/student-progress/mark-complete', WP_REST_Server::CREATABLE, 'mark_content_complete', 'user_is_logged_in');

        // === FAVORITE QUESTIONS ===
        $this->register_route('/favorite-questions/toggle', WP_REST_Server::CREATABLE, 'toggle_favorite_question', 'user_is_logged_in');

        // === QUESTION FEEDBACK ===
        $this->register_route('/question-feedback/submit', WP_REST_Server::CREATABLE, 'submit_question_feedback', 'user_is_logged_in');

        // === RANKINGS ===
        $this->register_route('/rankings/(?P<course_id>\d+)', WP_REST_Server::READABLE, 'get_course_rankings', 'user_is_logged_in');
    }

    // --- QUIZ ATTEMPT CALLBACKS ---

    public function start_quiz_attempt(WP_REST_Request $request)
    {
        global $wpdb;
        $user_id = get_current_user_id();
        $quiz_id = $request->get_param('quiz_id');

        if (empty($quiz_id) || !is_numeric($quiz_id)) {
            return new WP_Error('bad_request', 'Quiz ID is required.', ['status' => 400]);
        }

        $quiz = get_post($quiz_id);
        if (!$quiz || 'quiz' !== $quiz->post_type) {
            return new WP_Error('not_found', 'Quiz not found.', ['status' => 404]);
        }

        $course_id = $quiz->post_parent;
        $table_name = $wpdb->prefix . 'qe_quiz_attempts';

        $wpdb->insert($table_name, [
            'user_id' => $user_id,
            'quiz_id' => $quiz_id,
            'course_id' => $course_id,
            'start_time' => current_time('mysql', 1),
            'status' => 'in-progress',
        ]);

        $attempt_id = $wpdb->insert_id;
        if (!$attempt_id) {
            return new WP_Error('db_error', 'Could not create quiz attempt.', ['status' => 500]);
        }

        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
        if (empty($question_ids) || !is_array($question_ids)) {
            return new WP_Error('no_questions', 'This quiz has no questions.', ['status' => 404]);
        }

        $questions_for_student = [];
        foreach ($question_ids as $question_id) {
            $question_post = get_post($question_id);
            if ($question_post) {
                $options = get_post_meta($question_id, '_question_options', true);
                $formatted_options = [];
                if (is_array($options)) {
                    foreach ($options as $key => $option_data) {
                        $formatted_options[] = ['id' => $key, 'text' => $option_data['text']];
                    }
                }
                $questions_for_student[] = [
                    'id' => $question_post->ID,
                    'title' => $question_post->post_title,
                    'content' => $question_post->post_content,
                    'options' => $formatted_options,
                ];
            }
        }

        return new WP_REST_Response(['success' => true, 'attempt_id' => $attempt_id, 'questions' => $questions_for_student], 200);
    }

    public function submit_quiz_attempt(WP_REST_Request $request)
    {
        global $wpdb;
        $attempt_id = $request->get_param('attempt_id');
        $answers = $request->get_param('answers');

        if (empty($attempt_id) || empty($answers) || !is_array($answers)) {
            return new WP_Error('bad_request', 'Attempt ID and answers are required.', ['status' => 400]);
        }

        $total_questions = count($answers);
        $correct_answers = 0;
        $correct_with_risk = 0;
        $incorrect_with_risk = 0;
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';

        foreach ($answers as $answer) {
            $question_id = $answer['question_id'];
            $answer_given = $answer['answer_given'];
            $is_risked = !empty($answer['is_risked']);

            $options = get_post_meta($question_id, '_question_options', true);
            $correct_option_id = null;
            if (is_array($options)) {
                foreach ($options as $key => $option_data) {
                    if (!empty($option_data['is_correct'])) {
                        $correct_option_id = $key;
                        break;
                    }
                }
            }

            $is_correct = ($answer_given === $correct_option_id);

            if ($is_correct) {
                $correct_answers++;
                if ($is_risked)
                    $correct_with_risk++;
            } elseif ($is_risked) {
                $incorrect_with_risk++;
            }

            $wpdb->insert($answers_table, [
                'attempt_id' => $attempt_id,
                'question_id' => $question_id,
                'answer_given' => $answer_given,
                'is_correct' => $is_correct,
                'is_risked' => $is_risked,
            ]);
        }

        $score = ($total_questions > 0) ? ($correct_answers / $total_questions) * 10 : 0;
        $risked_points = $correct_with_risk - ($incorrect_with_risk / 2);
        $score_with_risk = $risked_points;

        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
        $wpdb->update($attempts_table, [
            'end_time' => current_time('mysql', 1),
            'status' => 'completed',
            'score' => $score,
            'score_with_risk' => $score_with_risk,
        ], ['attempt_id' => $attempt_id]);

        return new WP_REST_Response(['success' => true, 'message' => 'Quiz submitted successfully.', 'results' => ['score' => $score, 'score_with_risk' => $score_with_risk]], 200);
    }

    // --- OTHER CALLBACKS ---

    public function mark_content_complete(WP_REST_Request $request)
    {
        global $wpdb;
        $user_id = get_current_user_id();
        $content_id = $request->get_param('content_id');
        $content_type = $request->get_param('content_type');
        $course_id = $request->get_param('course_id');

        if (empty($content_id) || empty($content_type) || empty($course_id)) {
            return new WP_Error('bad_request', 'Content ID, type, and Course ID are required.', ['status' => 400]);
        }

        $table_name = $wpdb->prefix . 'qe_student_progress';
        $wpdb->replace($table_name, [
            'user_id' => $user_id,
            'course_id' => $course_id,
            'content_id' => $content_id,
            'content_type' => $content_type,
            'status' => 'completed',
            'last_viewed' => current_time('mysql', 1),
        ]);

        return new WP_REST_Response(['success' => true, 'message' => 'Progress updated.'], 200);
    }

    public function toggle_favorite_question(WP_REST_Request $request)
    {
        global $wpdb;
        $user_id = get_current_user_id();
        $question_id = $request->get_param('question_id');

        if (empty($question_id)) {
            return new WP_Error('bad_request', 'Question ID is required.', ['status' => 400]);
        }

        $table_name = $wpdb->prefix . 'qe_favorite_questions';
        $is_favorite = $wpdb->get_row($wpdb->prepare("SELECT favorite_id FROM $table_name WHERE user_id = %d AND question_id = %d", $user_id, $question_id));

        if ($is_favorite) {
            $wpdb->delete($table_name, ['favorite_id' => $is_favorite->favorite_id]);
            $status = 'removed';
        } else {
            $wpdb->insert($table_name, [
                'user_id' => $user_id,
                'question_id' => $question_id,
                'date_added' => current_time('mysql', 1),
            ]);
            $status = 'added';
        }

        return new WP_REST_Response(['success' => true, 'status' => $status], 200);
    }

    public function submit_question_feedback(WP_REST_Request $request)
    {
        global $wpdb;
        $user_id = get_current_user_id();
        $question_id = $request->get_param('question_id');
        $message = sanitize_textarea_field($request->get_param('message'));
        $type = $request->get_param('type'); // 'doubt' or 'challenge'

        if (empty($question_id) || empty($message) || empty($type)) {
            return new WP_Error('bad_request', 'Question ID, message, and type are required.', ['status' => 400]);
        }

        $table_name = $wpdb->prefix . 'qe_question_feedback';
        $wpdb->insert($table_name, [
            'question_id' => $question_id,
            'user_id' => $user_id,
            'feedback_type' => $type,
            'message' => $message,
            'status' => 'unresolved',
            'date_submitted' => current_time('mysql', 1),
        ]);

        return new WP_REST_Response(['success' => true, 'message' => 'Feedback submitted.'], 200);
    }

    public function get_course_rankings(WP_REST_Request $request)
    {
        global $wpdb;
        $course_id = $request['course_id'];

        $table_name = $wpdb->prefix . 'qe_rankings';
        $rankings = $wpdb->get_results($wpdb->prepare(
            "SELECT user_id, average_score, average_score_with_risk FROM $table_name WHERE course_id = %d ORDER BY average_score DESC",
            $course_id
        ));

        // Aquí podrías enriquecer los datos con nombres de usuario, etc.

        return new WP_REST_Response($rankings, 200);
    }

    // --- PERMISSION CALLBACKS ---

    public function user_is_logged_in()
    {
        if (!is_user_logged_in()) {
            return new WP_Error('rest_forbidden', 'You must be logged in.', ['status' => 401]);
        }
        return true;
    }

    public function user_can_submit_quiz(WP_REST_Request $request)
    {
        global $wpdb;
        $attempt_id = $request->get_param('attempt_id');
        $table_name = $wpdb->prefix . 'qe_quiz_attempts';
        $attempt_user_id = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM $table_name WHERE attempt_id = %d", $attempt_id));

        if (get_current_user_id() != $attempt_user_id) {
            return new WP_Error('rest_forbidden', 'You cannot submit this attempt.', ['status' => 403]);
        }
        return true;
    }

    // --- HELPER FUNCTIONS ---

    private function register_route($endpoint, $methods, $callback, $permission_callback)
    {
        register_rest_route($this->namespace, $endpoint, [
            'methods' => $methods,
            'callback' => [$this, $callback],
            'permission_callback' => [$this, $permission_callback],
        ]);
    }
}