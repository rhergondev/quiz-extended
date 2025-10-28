<?php
/**
 * Course Ranking API
 * 
 * Handles ranking for users within a course based on average quiz scores
 * 
 * @package QuizExtended
 */

if (!defined('ABSPATH')) {
    exit;
}

class QE_Course_Ranking_API extends QE_API_Base
{

    protected $namespace = 'quiz-extended/v1';
    protected $resource = 'courses';

    public function register_routes()
    {
        // GET /courses/{course_id}/ranking
        register_rest_route($this->namespace, '/' . $this->resource . '/(?P<course_id>\d+)/ranking', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'get_course_ranking'],
            'permission_callback' => [$this, 'check_read_permission'],
            'args' => [
                'course_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ],
            ]
        ]);

        // GET /courses/{course_id}/my-ranking-status
        register_rest_route($this->namespace, '/' . $this->resource . '/(?P<course_id>\d+)/my-ranking-status', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'get_my_ranking_status'],
            'permission_callback' => [$this, 'check_read_permission'],
            'args' => [
                'course_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ],
            ]
        ]);
    }

    /**
     * Get ranking for a course
     * Only includes users who have completed ALL quizzes in the course
     */
    public function get_course_ranking($request)
    {
        $course_id = (int) $request->get_param('course_id');

        // Verify course exists
        $course = get_post($course_id);
        if (!$course || $course->post_type !== 'qe_course') {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Course not found'
            ], 404);
        }

        // Get all quizzes for this course
        $course_quizzes = $this->get_course_quizzes($course_id);

        if (empty($course_quizzes)) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'ranking' => [],
                    'total_quizzes' => 0,
                    'message' => 'No quizzes found for this course'
                ]
            ], 200);
        }

        $quiz_ids = array_map('intval', $course_quizzes);
        $total_quizzes = count($quiz_ids);

        // Get all users who have attempted at least one quiz
        global $wpdb;
        $table_name = $wpdb->prefix . 'qe_quiz_attempts';

        $user_stats = $wpdb->get_results($wpdb->prepare("
            SELECT 
                user_id,
                COUNT(DISTINCT quiz_id) as quizzes_completed,
                AVG(score) as average_score,
                SUM(score) as total_score,
                COUNT(*) as total_attempts
            FROM {$table_name}
            WHERE quiz_id IN (" . implode(',', array_fill(0, count($quiz_ids), '%d')) . ")
            GROUP BY user_id
            HAVING quizzes_completed = %d
            ORDER BY average_score DESC, total_attempts ASC
        ", array_merge($quiz_ids, [$total_quizzes])));

        $ranking = [];
        $position = 1;

        foreach ($user_stats as $stat) {
            $user = get_userdata($stat->user_id);
            if (!$user)
                continue;

            $ranking[] = [
                'position' => $position,
                'user_id' => (int) $stat->user_id,
                'display_name' => $user->display_name,
                'avatar_url' => get_avatar_url($stat->user_id, ['size' => 48]),
                'average_score' => round((float) $stat->average_score, 2),
                'total_score' => (float) $stat->total_score,
                'quizzes_completed' => (int) $stat->quizzes_completed,
                'total_attempts' => (int) $stat->total_attempts,
                'is_current_user' => get_current_user_id() === (int) $stat->user_id
            ];

            $position++;
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'ranking' => $ranking,
                'total_quizzes' => $total_quizzes,
                'total_ranked_users' => count($ranking)
            ]
        ], 200);
    }

    /**
     * Get current user's ranking status for a course
     * Shows progress and temporary ranking if not all quizzes completed
     */
    public function get_my_ranking_status($request)
    {
        $course_id = (int) $request->get_param('course_id');
        $user_id = get_current_user_id();

        if (!$user_id) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // Get all quizzes for this course
        $course_quizzes = $this->get_course_quizzes($course_id);

        if (empty($course_quizzes)) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'has_completed_all' => false,
                    'total_quizzes' => 0,
                    'completed_quizzes' => 0,
                    'message' => 'No quizzes in this course'
                ]
            ], 200);
        }

        $quiz_ids = array_map('intval', $course_quizzes);
        $total_quizzes = count($quiz_ids);

        global $wpdb;
        $table_name = $wpdb->prefix . 'qe_quiz_attempts';

        // Get user's stats for this course
        $user_stats = $wpdb->get_row($wpdb->prepare("
            SELECT 
                COUNT(DISTINCT quiz_id) as quizzes_completed,
                AVG(score) as average_score,
                SUM(score) as total_score,
                COUNT(*) as total_attempts,
                MAX(completed_at) as last_attempt
            FROM {$table_name}
            WHERE quiz_id IN (" . implode(',', array_fill(0, count($quiz_ids), '%d')) . ")
            AND user_id = %d
        ", array_merge($quiz_ids, [$user_id])));

        $completed_quizzes = $user_stats ? (int) $user_stats->quizzes_completed : 0;
        $has_completed_all = $completed_quizzes === $total_quizzes;

        $response_data = [
            'has_completed_all' => $has_completed_all,
            'total_quizzes' => $total_quizzes,
            'completed_quizzes' => $completed_quizzes,
            'pending_quizzes' => $total_quizzes - $completed_quizzes,
            'average_score' => $user_stats ? round((float) $user_stats->average_score, 2) : 0,
            'total_attempts' => $user_stats ? (int) $user_stats->total_attempts : 0,
            'last_attempt' => $user_stats ? $user_stats->last_attempt : null
        ];

        // If not completed all, get temporary position
        if (!$has_completed_all && $user_stats && $completed_quizzes > 0) {
            // Calculate temporary ranking among users with same number of completed quizzes
            $temp_position = $wpdb->get_var($wpdb->prepare("
                SELECT COUNT(*) + 1
                FROM (
                    SELECT 
                        user_id,
                        AVG(score) as avg_score,
                        COUNT(DISTINCT quiz_id) as completed
                    FROM {$table_name}
                    WHERE quiz_id IN (" . implode(',', array_fill(0, count($quiz_ids), '%d')) . ")
                    GROUP BY user_id
                    HAVING completed = %d AND avg_score > %f
                ) as temp_ranking
            ", array_merge($quiz_ids, [$completed_quizzes, $user_stats->average_score])));

            $response_data['temporary_position'] = (int) $temp_position;
            $response_data['is_temporary'] = true;
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => $response_data
        ], 200);
    }

    /**
     * Get all quiz IDs for a course
     */
    private function get_course_quizzes($course_id)
    {
        // Get lessons for this course
        $lessons = get_posts([
            'post_type' => 'qe_lesson',
            'meta_query' => [
                [
                    'key' => '_course_ids',
                    'value' => sprintf(':"%d";', $course_id),
                    'compare' => 'LIKE'
                ]
            ],
            'posts_per_page' => -1,
            'fields' => 'ids'
        ]);

        if (empty($lessons)) {
            return [];
        }

        // Get quizzes for these lessons
        $quiz_ids = [];
        foreach ($lessons as $lesson_id) {
            $lesson_quizzes = get_post_meta($lesson_id, '_quiz_ids', true);
            if (is_array($lesson_quizzes)) {
                $quiz_ids = array_merge($quiz_ids, $lesson_quizzes);
            }
        }

        return array_unique($quiz_ids);
    }

    public function check_read_permission($request)
    {
        return is_user_logged_in();
    }
}
