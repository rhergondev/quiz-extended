<?php
/**
 * QE_User_Stats_API Class
 *
 * Handles user statistics endpoints.
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

class QE_User_Stats_API extends QE_API_Base
{
    /**
     * Register routes
     */
    public function register_routes()
    {
        // Get user question statistics
        $this->register_secure_route(
            '/user-stats/questions',
            WP_REST_Server::READABLE,
            'get_user_question_stats',
            [
                'args' => [
                    'course_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'description' => 'Filter by course ID (optional)'
                    ]
                ]
            ]
        );
    }

    /**
     * Get user question statistics
     *
     * Returns aggregated statistics of correct/incorrect/unanswered questions
     * for the current user, optionally filtered by course.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_user_question_stats(WP_REST_Request $request)
    {
        $user_id = get_current_user_id();
        if (empty($user_id)) {
            return $this->error_response('not_logged_in', __('You must be logged in.', 'quiz-extended'), 401);
        }

        $course_id = $request->get_param('course_id');

        global $wpdb;
        $table_name = $this->get_table('user_question_stats');

        // Build query
        $where = "user_id = %d";
        $params = [$user_id];

        if ($course_id) {
            $where .= " AND course_id = %d";
            $params[] = $course_id;
        }

        // Get aggregated counts
        $stats = $wpdb->get_row($wpdb->prepare(
            "SELECT 
                COUNT(*) as total_questions,
                SUM(CASE WHEN last_answer_status = 'correct' THEN 1 ELSE 0 END) as correct_answers,
                SUM(CASE WHEN last_answer_status = 'incorrect' THEN 1 ELSE 0 END) as incorrect_answers,
                SUM(CASE WHEN last_answer_status = 'unanswered' THEN 1 ELSE 0 END) as unanswered
            FROM {$table_name}
            WHERE {$where}",
            ...$params
        ));

        if (!$stats) {
            return $this->success_response([
                'total_questions' => 0,
                'correct_answers' => 0,
                'incorrect_answers' => 0,
                'unanswered' => 0
            ]);
        }

        return $this->success_response([
            'total_questions' => (int) $stats->total_questions,
            'correct_answers' => (int) $stats->correct_answers,
            'incorrect_answers' => (int) $stats->incorrect_answers,
            'unanswered' => (int) $stats->unanswered
        ]);
    }
}

// Initialize
new QE_User_Stats_API();
