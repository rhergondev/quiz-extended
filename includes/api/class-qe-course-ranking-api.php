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

    protected $namespace = 'qe/v1';
    protected $resource = 'course-ranking';

    public function register_routes()
    {
        // GET /qe/v1/course-ranking/ranking?course_id=X
        register_rest_route($this->namespace, '/' . $this->resource . '/ranking', [
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
                'page' => [
                    'required' => false,
                    'default' => 1,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ],
                'per_page' => [
                    'required' => false,
                    'default' => 20,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ],
                'with_risk' => [
                    'required' => false,
                    'default' => false,
                ],
            ]
        ]);

        // GET /qe/v1/course-ranking/my-ranking-status?course_id=X
        register_rest_route($this->namespace, '/' . $this->resource . '/my-ranking-status', [
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
        $with_risk = $request->get_param('with_risk') === 'true' || $request->get_param('with_risk') === true;
        $page = max(1, (int) $request->get_param('page', 1));
        $per_page = min(50, max(1, (int) $request->get_param('per_page', 10)));

        $current_user_id = get_current_user_id();

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
                    'statistics' => [],
                    'my_stats' => null,
                    'pagination' => [
                        'current_page' => 1,
                        'total_pages' => 0,
                        'per_page' => $per_page,
                        'total_users' => 0
                    ],
                    'message' => 'No quizzes found for this course'
                ]
            ], 200);
        }

        $quiz_ids = array_map('intval', $course_quizzes);
        $total_quizzes = count($quiz_ids);

        global $wpdb;
        $table_name = $wpdb->prefix . 'qe_quiz_attempts';

        // Determine which score column to use
        $score_column = $with_risk ? 'score_with_risk' : 'score';

        // Build the quiz_ids placeholders
        $quiz_placeholders = implode(',', array_fill(0, count($quiz_ids), '%d'));

        // Get ALL users who have completed at least 1 quiz (for finding current user position)
        // Using ONLY the last attempt per quiz per user
        $order_column = $with_risk ? 'average_score_with_risk' : 'average_score_without_risk';
        $all_users_raw = $wpdb->get_results($wpdb->prepare("
            SELECT 
                la.user_id,
                COUNT(DISTINCT la.quiz_id) as quizzes_completed,
                AVG(la.score) as average_score_without_risk,
                AVG(la.score_with_risk) as average_score_with_risk,
                SUM(la.score) as total_score,
                COUNT(*) as total_attempts
            FROM (
                SELECT t1.user_id, t1.quiz_id, t1.score, t1.score_with_risk
                FROM {$table_name} t1
                INNER JOIN (
                    SELECT user_id, quiz_id, MAX(end_time) as max_end_time
                    FROM {$table_name}
                    WHERE quiz_id IN ({$quiz_placeholders})
                    AND status = 'completed'
                    GROUP BY user_id, quiz_id
                ) t2 ON t1.user_id = t2.user_id 
                    AND t1.quiz_id = t2.quiz_id 
                    AND t1.end_time = t2.max_end_time
                WHERE t1.status = 'completed'
            ) la
            GROUP BY la.user_id
            HAVING quizzes_completed >= 1
        ", $quiz_ids));

        // Filter out non-existent WordPress users BEFORE calculating positions and statistics
        $all_users = [];
        foreach ($all_users_raw as $user_data) {
            $wp_user = get_userdata($user_data->user_id);
            if ($wp_user) {
                $all_users[] = $user_data;
            }
        }

        // Calculate statistics from filtered users only
        $total_valid_users = count($all_users);
        $sum_scores_without_risk = 0;
        $sum_scores_with_risk = 0;
        foreach ($all_users as $user_data) {
            $sum_scores_without_risk += (float) $user_data->average_score_without_risk;
            $sum_scores_with_risk += (float) $user_data->average_score_with_risk;
        }

        $statistics = [
            'total_users' => $total_valid_users,
            'avg_score_without_risk' => $total_valid_users > 0 ? round($sum_scores_without_risk / $total_valid_users, 2) : 0,
            'avg_score_with_risk' => $total_valid_users > 0 ? round($sum_scores_with_risk / $total_valid_users, 2) : 0,
            'top_10_cutoff_without_risk' => 0,
            'top_10_cutoff_with_risk' => 0,
            'top_20_cutoff_without_risk' => 0,
            'top_20_cutoff_with_risk' => 0,
        ];

        // Sort users by score
        // Re-sort in PHP since ORDER BY uses alias
        usort($all_users, function ($a, $b) use ($with_risk) {
            $a_score = $with_risk ? $a->average_score_with_risk : $a->average_score_without_risk;
            $b_score = $with_risk ? $b->average_score_with_risk : $b->average_score_without_risk;
            if ($b_score != $a_score) {
                return $b_score > $a_score ? 1 : -1;
            }
            return $a->total_attempts - $b->total_attempts;
        });

        $total_users = count($all_users);
        $total_pages = ceil($total_users / $per_page);

        // Find current user's position and stats
        $current_user_position = null;
        $my_stats = null;

        // Calculate positions for both risk modes
        $position_without_risk = null;
        $position_with_risk = null;

        // Sort for without risk
        $users_sorted_without_risk = $all_users;
        usort($users_sorted_without_risk, function ($a, $b) {
            $score_diff = $b->average_score_without_risk - $a->average_score_without_risk;
            if ($score_diff != 0)
                return $score_diff > 0 ? 1 : -1;
            return $a->total_attempts - $b->total_attempts;
        });

        // Sort for with risk
        $users_sorted_with_risk = $all_users;
        usort($users_sorted_with_risk, function ($a, $b) {
            $score_diff = $b->average_score_with_risk - $a->average_score_with_risk;
            if ($score_diff != 0)
                return $score_diff > 0 ? 1 : -1;
            return $a->total_attempts - $b->total_attempts;
        });

        // Calculate top 10% cutoff scores
        $users_for_top10 = count($users_sorted_without_risk);
        if ($users_for_top10 > 0) {
            $top_10_index = max(0, (int) ceil($users_for_top10 * 0.1) - 1);
            $top_20_index = max(0, (int) ceil($users_for_top10 * 0.2) - 1);

            if (isset($users_sorted_without_risk[$top_10_index])) {
                $statistics['top_10_cutoff_without_risk'] = round((float) $users_sorted_without_risk[$top_10_index]->average_score_without_risk, 2);
            }
            if (isset($users_sorted_with_risk[$top_10_index])) {
                $statistics['top_10_cutoff_with_risk'] = round((float) $users_sorted_with_risk[$top_10_index]->average_score_with_risk, 2);
            }
            // Top 20% cutoff (nota de corte)
            if (isset($users_sorted_without_risk[$top_20_index])) {
                $statistics['top_20_cutoff_without_risk'] = round((float) $users_sorted_without_risk[$top_20_index]->average_score_without_risk, 2);
            }
            if (isset($users_sorted_with_risk[$top_20_index])) {
                $statistics['top_20_cutoff_with_risk'] = round((float) $users_sorted_with_risk[$top_20_index]->average_score_with_risk, 2);
            }
        }

        // Find positions
        foreach ($users_sorted_without_risk as $index => $user_data) {
            if ((int) $user_data->user_id === $current_user_id) {
                $position_without_risk = $index + 1;
                break;
            }
        }

        foreach ($users_sorted_with_risk as $index => $user_data) {
            if ((int) $user_data->user_id === $current_user_id) {
                $position_with_risk = $index + 1;
                break;
            }
        }

        // Get user stats
        foreach ($all_users as $index => $user_data) {
            if ((int) $user_data->user_id === $current_user_id) {
                $current_user_position = $with_risk ? $position_with_risk : $position_without_risk;

                $score_without_risk = round((float) $user_data->average_score_without_risk, 2);
                $score_with_risk = round((float) $user_data->average_score_with_risk, 2);

                $my_stats = [
                    'position' => $current_user_position,
                    'position_without_risk' => $position_without_risk,
                    'position_with_risk' => $position_with_risk,
                    'score_without_risk' => $score_without_risk,
                    'score_with_risk' => $score_with_risk,
                    'percentile_without_risk' => round($score_without_risk - $statistics['avg_score_without_risk'], 2),
                    'percentile_with_risk' => round($score_with_risk - $statistics['avg_score_with_risk'], 2),
                    'total_attempts' => (int) $user_data->total_attempts,
                ];
                break;
            }
        }

        // If user found, calculate which page they're on and adjust page if needed
        $user_page = null;
        if ($current_user_position) {
            $user_page = ceil($current_user_position / $per_page);
            // If page not specified or is 1, go to user's page
            if ($page === 1 && $user_page > 1) {
                $page = $user_page;
            }
        }

        // Get paginated results
        $offset = ($page - 1) * $per_page;
        $paged_users = array_slice($all_users, $offset, $per_page);

        $ranking = [];
        $start_position = $offset + 1;

        foreach ($paged_users as $index => $stat) {
            $user = get_userdata($stat->user_id);
            if (!$user)
                continue;

            $position = $start_position + $index;
            $score_value = $with_risk ?
                round((float) $stat->average_score_with_risk, 2) :
                round((float) $stat->average_score_without_risk, 2);

            $ranking[] = [
                'position' => $position,
                'user_id' => (int) $stat->user_id,
                'display_name' => $user->display_name,
                'avatar_url' => get_avatar_url($stat->user_id, ['size' => 48]),
                'score_without_risk' => round((float) $stat->average_score_without_risk, 2),
                'score_with_risk' => round((float) $stat->average_score_with_risk, 2),
                'score' => $score_value, // Current view score
                'quizzes_completed' => (int) $stat->quizzes_completed,
                'total_attempts' => (int) $stat->total_attempts,
                'is_current_user' => get_current_user_id() === (int) $stat->user_id
            ];
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'ranking' => $ranking,
                'total_quizzes' => $total_quizzes,
                'statistics' => $statistics,
                'my_stats' => $my_stats,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $total_pages,
                    'per_page' => $per_page,
                    'total_users' => $total_users,
                    'user_page' => $user_page
                ],
                'with_risk' => $with_risk
            ]
        ], 200);
    }

    /**
     * Get current user's ranking status for a course
     * Shows progress and ranking position (users enter ranking with at least 1 quiz completed)
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

        // Get user's stats using ONLY the last attempt of each quiz
        $last_attempts_scores = [];
        $last_attempts_scores_with_risk = [];
        $total_attempts_count = 0;
        $last_attempt_time = null;

        foreach ($quiz_ids as $quiz_id) {
            $last_attempt = $wpdb->get_row($wpdb->prepare("
                SELECT score, score_with_risk, end_time
                FROM {$table_name}
                WHERE user_id = %d 
                AND quiz_id = %d
                AND status = 'completed'
                ORDER BY end_time DESC
                LIMIT 1
            ", $user_id, $quiz_id));

            if ($last_attempt) {
                $last_attempts_scores[] = (float) $last_attempt->score;
                $last_attempts_scores_with_risk[] = (float) $last_attempt->score_with_risk;
                $total_attempts_count++;

                if (!$last_attempt_time || $last_attempt->end_time > $last_attempt_time) {
                    $last_attempt_time = $last_attempt->end_time;
                }
            }
        }

        // Calculate stats from last attempts only
        $quizzes_completed = count($last_attempts_scores);
        $average_score = $quizzes_completed > 0 ? array_sum($last_attempts_scores) / $quizzes_completed : 0;
        $average_score_with_risk = $quizzes_completed > 0 ? array_sum($last_attempts_scores_with_risk) / $quizzes_completed : 0;

        $user_stats = (object) [
            'quizzes_completed' => $quizzes_completed,
            'average_score' => $average_score,
            'average_score_with_risk' => $average_score_with_risk,
            'total_attempts' => $total_attempts_count,
            'last_attempt' => $last_attempt_time
        ];

        $completed_quizzes = $user_stats ? (int) $user_stats->quizzes_completed : 0;
        $has_completed_all = $completed_quizzes === $total_quizzes;

        $response_data = [
            'has_completed_all' => $has_completed_all,
            'total_quizzes' => $total_quizzes,
            'completed_quizzes' => $completed_quizzes,
            'pending_quizzes' => $total_quizzes - $completed_quizzes,
            'average_score' => $user_stats ? round((float) $user_stats->average_score, 2) : 0,
            'average_score_with_risk' => $user_stats ? round((float) $user_stats->average_score_with_risk, 2) : 0,
            'total_attempts' => $user_stats ? (int) $user_stats->total_attempts : 0,
            'last_attempt' => $user_stats ? $user_stats->last_attempt : null
        ];

        // Calculate position among ALL users with at least 1 quiz completed
        // IMPORTANT: Only count users that still exist in WordPress
        if ($user_stats && $completed_quizzes > 0) {
            // Get all users with scores (including score_with_risk) and filter out non-existent users
            $all_user_scores = $wpdb->get_results($wpdb->prepare("
                SELECT 
                    la.user_id,
                    AVG(la.score) as avg_score,
                    AVG(la.score_with_risk) as avg_score_with_risk,
                    COUNT(DISTINCT la.quiz_id) as completed
                FROM (
                    SELECT t1.user_id, t1.quiz_id, t1.score, t1.score_with_risk
                    FROM {$table_name} t1
                    INNER JOIN (
                        SELECT user_id, quiz_id, MAX(end_time) as max_end_time
                        FROM {$table_name}
                        WHERE quiz_id IN (" . implode(',', array_fill(0, count($quiz_ids), '%d')) . ")
                        AND status = 'completed'
                        GROUP BY user_id, quiz_id
                    ) t2 ON t1.user_id = t2.user_id 
                        AND t1.quiz_id = t2.quiz_id 
                        AND t1.end_time = t2.max_end_time
                    WHERE t1.status = 'completed'
                ) la
                GROUP BY la.user_id
                HAVING completed >= 1
            ", $quiz_ids));

            // Filter to only include existing users and count those with higher scores
            $position = 1;
            $position_with_risk = 1;
            $total_users_in_ranking = 0;
            foreach ($all_user_scores as $user_score) {
                // Skip if user doesn't exist in WordPress
                $wp_user = get_userdata($user_score->user_id);
                if (!$wp_user) {
                    continue;
                }

                // Count valid users in ranking
                $total_users_in_ranking++;

                // Skip current user for position calculation
                if ((int) $user_score->user_id === $user_id) {
                    continue;
                }

                // Count users with higher scores (without risk)
                if ((float) $user_score->avg_score > $user_stats->average_score) {
                    $position++;
                }

                // Count users with higher scores (with risk)
                if ((float) $user_score->avg_score_with_risk > $user_stats->average_score_with_risk) {
                    $position_with_risk++;
                }
            }

            $response_data['position'] = $position;
            $response_data['position_with_risk'] = $position_with_risk;
            $response_data['total_users'] = $total_users_in_ranking;
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
        // Get lesson IDs from course meta
        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

        if (empty($lesson_ids) || !is_array($lesson_ids)) {
            return [];
        }

        // Get lessons
        $lessons = get_posts([
            'post_type' => 'qe_lesson',
            'include' => $lesson_ids,
            'posts_per_page' => -1,
            'fields' => 'ids'
        ]);

        if (empty($lessons)) {
            return [];
        }

        // Collect all quiz IDs from lessons
        $quiz_ids = [];
        foreach ($lessons as $lesson_id) {
            // Get from _quiz_ids meta
            $lesson_quizzes = get_post_meta($lesson_id, '_quiz_ids', true);
            if (is_array($lesson_quizzes)) {
                $quiz_ids = array_merge($quiz_ids, $lesson_quizzes);
            }

            // Get from _lesson_steps
            $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
            if (!empty($lesson_steps) && is_array($lesson_steps)) {
                foreach ($lesson_steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                        $quiz_ids[] = (int) $step['data']['quiz_id'];
                    }
                }
            }
        }

        return array_unique(array_filter($quiz_ids));
    }

    public function check_read_permission($request)
    {
        return is_user_logged_in();
    }
}

// Initialize the API
new QE_Course_Ranking_API();
