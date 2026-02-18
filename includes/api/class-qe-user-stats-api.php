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
                    ],
                    'lesson_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'description' => 'Filter by lesson ID (optional)'
                    ],
                    'difficulty' => [
                        'required' => false,
                        'type' => 'string',
                        'description' => 'Filter by difficulty level (easy, medium, hard)'
                    ]
                ]
            ]
        );

        // Get performance by lesson
        $this->register_secure_route(
            '/user-stats/performance-by-lesson',
            WP_REST_Server::READABLE,
            'get_performance_by_lesson',
            [
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'description' => 'Course ID'
                    ]
                ]
            ]
        );

        // Get weak spots
        $this->register_secure_route(
            '/user-stats/weak-spots',
            WP_REST_Server::READABLE,
            'get_weak_spots',
            [
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'description' => 'Course ID'
                    ]
                ]
            ]
        );

        // Get difficulty stats
        $this->register_secure_route(
            '/user-stats/difficulty-matrix',
            WP_REST_Server::READABLE,
            'get_difficulty_stats',
            [
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'description' => 'Course ID'
                    ]
                ]
            ]
        );

        // Get score evolution over time
        $this->register_secure_route(
            '/user-stats/score-evolution',
            WP_REST_Server::READABLE,
            'get_score_evolution',
            [
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'description' => 'Course ID'
                    ],
                    'lesson_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'description' => 'Filter by lesson ID (optional)'
                    ],
                    'period' => [
                        'required' => false,
                        'type' => 'string',
                        'default' => 'week',
                        'enum' => ['week', 'month', 'all'],
                        'description' => 'Time period to show'
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
     * Also includes global averages for comparison.
     * 
     * OPTIMIZED: Uses pre-calculated qe_user_question_stats table for fast reads.
     * Falls back to real-time calculation if table is empty.
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
        $lesson_id = $request->get_param('lesson_id');
        $difficulty = $request->get_param('difficulty');

        global $wpdb;
        $stats_table = $wpdb->prefix . 'qe_user_question_stats';

        // Check if stats table exists and has data for this user
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$stats_table'");
        $user_has_data = false;

        if ($table_exists) {
            // Check if THIS USER has data in the pre-calculated table
            $user_has_data = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $stats_table WHERE user_id = %d LIMIT 1",
                $user_id
            )) > 0;
        }

        if ($user_has_data) {
            // Use optimized pre-calculated stats
            return $this->get_user_question_stats_from_table($user_id, $course_id, $lesson_id, $difficulty);
        } else {
            // Fallback to real-time calculation
            return $this->get_user_question_stats_realtime($user_id, $course_id, $lesson_id, $difficulty);
        }
    }

    /**
     * Get stats from pre-calculated table (FAST)
     */
    private function get_user_question_stats_from_table($user_id, $course_id, $lesson_id, $difficulty = null)
    {
        global $wpdb;
        $stats_table = $wpdb->prefix . 'qe_user_question_stats';

        // Build filters
        $course_filter = $course_id ? $wpdb->prepare("AND s.course_id = %d", $course_id) : "";

        $quiz_filter = "";
        if ($lesson_id) {
            $quiz_ids = $this->get_quiz_ids_for_lesson($lesson_id);
            if (!empty($quiz_ids)) {
                $quiz_filter = "AND s.quiz_id IN (" . implode(',', array_map('intval', $quiz_ids)) . ")";
            }
        }

        // Difficulty filter - use WHERE EXISTS instead of INNER JOIN
        // This avoids eliminating questions without the meta field
        $difficulty_join = "";
        $difficulty_filter = "";
        if ($difficulty && in_array($difficulty, ['easy', 'medium', 'hard'])) {
            $difficulty_filter = $wpdb->prepare(
                "AND EXISTS (
                    SELECT 1 FROM {$wpdb->postmeta} pm 
                    WHERE pm.post_id = s.question_id 
                    AND pm.meta_key = '_difficulty_level' 
                    AND pm.meta_value = %s
                )",
                $difficulty
            );
        }

        // USER STATS - Simple aggregation from pre-calculated table
        $user_stats = $wpdb->get_row($wpdb->prepare("
            SELECT 
                COUNT(*) as total_questions,
                SUM(CASE WHEN s.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
                SUM(CASE WHEN s.is_correct = 0 AND s.last_answer_status NOT IN ('unanswered') THEN 1 ELSE 0 END) as incorrect_answers,
                SUM(CASE WHEN s.last_answer_status = 'unanswered' THEN 1 ELSE 0 END) as unanswered,
                SUM(CASE WHEN s.last_answer_status = 'correct_with_risk' THEN 1 ELSE 0 END) as correct_with_risk,
                SUM(CASE WHEN s.last_answer_status = 'correct_without_risk' THEN 1 ELSE 0 END) as correct_without_risk,
                SUM(CASE WHEN s.last_answer_status = 'incorrect_with_risk' THEN 1 ELSE 0 END) as incorrect_with_risk,
                SUM(CASE WHEN s.last_answer_status = 'incorrect_without_risk' THEN 1 ELSE 0 END) as incorrect_without_risk
            FROM {$stats_table} s
            WHERE s.user_id = %d {$course_filter} {$quiz_filter} {$difficulty_filter}
        ", $user_id));

        // GLOBAL STATS - Aggregation across all users
        $global_stats = $wpdb->get_row("
            SELECT 
                COUNT(DISTINCT s.user_id) as total_users,
                COUNT(*) as total_answers,
                SUM(CASE WHEN s.is_correct = 1 THEN 1 ELSE 0 END) as global_correct,
                SUM(CASE WHEN s.is_correct = 0 AND s.last_answer_status NOT IN ('unanswered') THEN 1 ELSE 0 END) as global_incorrect,
                SUM(CASE WHEN s.last_answer_status = 'unanswered' THEN 1 ELSE 0 END) as global_unanswered,
                SUM(CASE WHEN s.last_answer_status = 'correct_with_risk' THEN 1 ELSE 0 END) as global_correct_with_risk,
                SUM(CASE WHEN s.last_answer_status = 'correct_without_risk' THEN 1 ELSE 0 END) as global_correct_without_risk,
                SUM(CASE WHEN s.last_answer_status = 'incorrect_with_risk' THEN 1 ELSE 0 END) as global_incorrect_with_risk,
                SUM(CASE WHEN s.last_answer_status = 'incorrect_without_risk' THEN 1 ELSE 0 END) as global_incorrect_without_risk
            FROM {$stats_table} s
            WHERE 1=1 {$course_filter} {$quiz_filter} {$difficulty_filter}
        ");

        return $this->format_stats_response($user_stats, $global_stats);
    }

    /**
     * Get stats with real-time calculation (SLOWER - fallback)
     * Uses only the LATEST answer per question for each user
     */
    private function get_user_question_stats_realtime($user_id, $course_id, $lesson_id, $difficulty = null)
    {
        global $wpdb;
        $attempts_table = $this->get_table('quiz_attempts');
        $answers_table = $this->get_table('attempt_answers');

        // Build filters for WHERE clause
        $user_course_filter = $course_id ? $wpdb->prepare("AND att.course_id = %d", $course_id) : "";
        $global_course_filter = $course_id ? $wpdb->prepare("AND att2.course_id = %d", $course_id) : "";

        $user_quiz_filter = "";
        $global_quiz_filter = "";
        if ($lesson_id) {
            $quiz_ids = $this->get_quiz_ids_for_lesson($lesson_id);
            if (!empty($quiz_ids)) {
                $quiz_ids_str = implode(',', array_map('intval', $quiz_ids));
                $user_quiz_filter = "AND att.quiz_id IN ({$quiz_ids_str})";
                $global_quiz_filter = "AND att2.quiz_id IN ({$quiz_ids_str})";
            }
        }

        // Difficulty filter - use WHERE EXISTS instead of INNER JOIN  
        // This avoids eliminating questions without the meta field
        $user_difficulty_join = "";
        $user_difficulty_filter = "";
        $global_difficulty_join = "";
        $global_difficulty_filter = "";
        if ($difficulty && in_array($difficulty, ['easy', 'medium', 'hard'])) {
            $user_difficulty_filter = $wpdb->prepare(
                "AND EXISTS (
                    SELECT 1 FROM {$wpdb->postmeta} pm 
                    WHERE pm.post_id = a.question_id 
                    AND pm.meta_key = '_difficulty_level' 
                    AND pm.meta_value = %s
                )",
                $difficulty
            );
            $global_difficulty_filter = $wpdb->prepare(
                "AND EXISTS (
                    SELECT 1 FROM {$wpdb->postmeta} pm2 
                    WHERE pm2.post_id = a.question_id 
                    AND pm2.meta_key = '_difficulty_level' 
                    AND pm2.meta_value = %s
                )",
                $difficulty
            );
        }

        // USER STATS - Get latest answer per question using subquery
        // This ensures we only count the most recent answer for each question
        $user_stats = $wpdb->get_row($wpdb->prepare("
            SELECT 
                COUNT(*) as total_questions,
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
                SUM(CASE WHEN is_correct = 0 AND answer_given IS NOT NULL AND answer_given != '' THEN 1 ELSE 0 END) as incorrect_answers,
                SUM(CASE WHEN answer_given IS NULL OR answer_given = '' THEN 1 ELSE 0 END) as unanswered,
                SUM(CASE WHEN is_correct = 1 AND is_risked = 1 THEN 1 ELSE 0 END) as correct_with_risk,
                SUM(CASE WHEN is_correct = 1 AND is_risked = 0 THEN 1 ELSE 0 END) as correct_without_risk,
                SUM(CASE WHEN is_correct = 0 AND answer_given IS NOT NULL AND answer_given != '' AND is_risked = 1 THEN 1 ELSE 0 END) as incorrect_with_risk,
                SUM(CASE WHEN is_correct = 0 AND answer_given IS NOT NULL AND answer_given != '' AND is_risked = 0 THEN 1 ELSE 0 END) as incorrect_without_risk
            FROM (
                SELECT a.question_id, a.is_correct, a.is_risked, a.answer_given
                FROM {$answers_table} a
                INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
                WHERE att.user_id = %d 
                  AND att.status = 'completed'
                  {$user_course_filter}
                  {$user_quiz_filter}
                  {$user_difficulty_filter}
                  AND a.attempt_id = (
                      SELECT MAX(a2.attempt_id)
                      FROM {$answers_table} a2
                      INNER JOIN {$attempts_table} att3 ON a2.attempt_id = att3.attempt_id
                      WHERE att3.user_id = %d
                        AND att3.status = 'completed'
                        AND a2.question_id = a.question_id
                  )
                GROUP BY a.question_id
            ) as latest_answers
        ", $user_id, $user_id));

        // GLOBAL STATS - Simplified aggregate (not per-question latest, too expensive)
        // This gives approximate global stats across all users
        $global_stats = $wpdb->get_row("
            SELECT 
                COUNT(DISTINCT att2.user_id) as total_users,
                COUNT(*) as total_answers,
                SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as global_correct,
                SUM(CASE WHEN a.is_correct = 0 AND a.answer_given IS NOT NULL AND a.answer_given != '' THEN 1 ELSE 0 END) as global_incorrect,
                SUM(CASE WHEN a.answer_given IS NULL OR a.answer_given = '' THEN 1 ELSE 0 END) as global_unanswered,
                SUM(CASE WHEN a.is_correct = 1 AND a.is_risked = 1 THEN 1 ELSE 0 END) as global_correct_with_risk,
                SUM(CASE WHEN a.is_correct = 1 AND a.is_risked = 0 THEN 1 ELSE 0 END) as global_correct_without_risk,
                SUM(CASE WHEN a.is_correct = 0 AND a.answer_given IS NOT NULL AND a.answer_given != '' AND a.is_risked = 1 THEN 1 ELSE 0 END) as global_incorrect_with_risk,
                SUM(CASE WHEN a.is_correct = 0 AND a.answer_given IS NOT NULL AND a.answer_given != '' AND a.is_risked = 0 THEN 1 ELSE 0 END) as global_incorrect_without_risk
            FROM {$answers_table} a
            INNER JOIN {$attempts_table} att2 ON a.attempt_id = att2.attempt_id
            WHERE att2.status = 'completed' {$global_course_filter} {$global_quiz_filter} {$global_difficulty_filter}
        ");

        return $this->format_stats_response($user_stats, $global_stats);
    }

    /**
     * Get quiz IDs for a lesson
     */
    private function get_quiz_ids_for_lesson($lesson_id)
    {
        $quiz_ids = [];

        // Get from _quiz_ids meta
        $quiz_ids_meta = get_post_meta($lesson_id, '_quiz_ids', true);
        if (!empty($quiz_ids_meta) && is_array($quiz_ids_meta)) {
            $quiz_ids = array_merge($quiz_ids, $quiz_ids_meta);
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

        return array_unique(array_filter($quiz_ids));
    }

    /**
     * Format stats response
     */
    private function format_stats_response($user_stats, $global_stats)
    {
        // Calculate global percentages
        $total_global_answers = (int) ($global_stats->total_answers ?? 0);
        $global_correct_pct = $total_global_answers > 0
            ? round(((int) $global_stats->global_correct / $total_global_answers) * 100, 1)
            : 0;
        $global_incorrect_pct = $total_global_answers > 0
            ? round(((int) $global_stats->global_incorrect / $total_global_answers) * 100, 1)
            : 0;
        $global_unanswered_pct = $total_global_answers > 0
            ? round(((int) $global_stats->global_unanswered / $total_global_answers) * 100, 1)
            : 0;

        // User percentages
        $total_user = (int) ($user_stats->total_questions ?? 0);
        $user_correct_pct = $total_user > 0
            ? round(((int) $user_stats->correct_answers / $total_user) * 100, 1)
            : 0;
        $user_incorrect_pct = $total_user > 0
            ? round(((int) $user_stats->incorrect_answers / $total_user) * 100, 1)
            : 0;
        $user_unanswered_pct = $total_user > 0
            ? round(((int) $user_stats->unanswered / $total_user) * 100, 1)
            : 0;

        return $this->success_response([
            // User stats
            'total_questions' => $total_user,
            'correct_answers' => (int) ($user_stats->correct_answers ?? 0),
            'incorrect_answers' => (int) ($user_stats->incorrect_answers ?? 0),
            'unanswered' => (int) ($user_stats->unanswered ?? 0),
            'correct_with_risk' => (int) ($user_stats->correct_with_risk ?? 0),
            'correct_without_risk' => (int) ($user_stats->correct_without_risk ?? 0),
            'incorrect_with_risk' => (int) ($user_stats->incorrect_with_risk ?? 0),
            'incorrect_without_risk' => (int) ($user_stats->incorrect_without_risk ?? 0),
            // User percentages
            'user_correct_pct' => $user_correct_pct,
            'user_incorrect_pct' => $user_incorrect_pct,
            'user_unanswered_pct' => $user_unanswered_pct,
            // Global averages (for comparison)
            'global_stats' => [
                'total_users' => (int) ($global_stats->total_users ?? 0),
                'correct_pct' => $global_correct_pct,
                'incorrect_pct' => $global_incorrect_pct,
                'unanswered_pct' => $global_unanswered_pct,
                'correct_with_risk_pct' => $total_global_answers > 0
                    ? round(((int) $global_stats->global_correct_with_risk / $total_global_answers) * 100, 1) : 0,
                'correct_without_risk_pct' => $total_global_answers > 0
                    ? round(((int) $global_stats->global_correct_without_risk / $total_global_answers) * 100, 1) : 0,
                'incorrect_with_risk_pct' => $total_global_answers > 0
                    ? round(((int) $global_stats->global_incorrect_with_risk / $total_global_answers) * 100, 1) : 0,
                'incorrect_without_risk_pct' => $total_global_answers > 0
                    ? round(((int) $global_stats->global_incorrect_without_risk / $total_global_answers) * 100, 1) : 0,
            ],
            // Comparison (user vs global)
            'comparison' => [
                'correct_diff' => round($user_correct_pct - $global_correct_pct, 1),
                'incorrect_diff' => round($user_incorrect_pct - $global_incorrect_pct, 1),
                'unanswered_diff' => round($user_unanswered_pct - $global_unanswered_pct, 1),
            ]
        ]);
    }

    /**
     * Get performance by lesson
     */
    public function get_performance_by_lesson(WP_REST_Request $request)
    {
        $user_id = get_current_user_id();
        $course_id = $request->get_param('course_id');

        // ✅ CORRECTO: Obtener lesson_ids desde el CURSO (no buscar _course_ids en lessons)
        // Esta es la forma correcta según class-qe-course-lessons-api.php
        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

        if (!is_array($lesson_ids) || empty($lesson_ids)) {
            return $this->success_response(['lessons' => []]);
        }

        // Apply _lesson_order_map sorting if available (same logic as class-qe-course-lessons-api.php)
        $lesson_order_map = get_post_meta($course_id, '_lesson_order_map', true);
        $query_args = [
            'post_type'      => 'qe_lesson',
            'post__in'       => $lesson_ids,
            'posts_per_page' => -1,
            'post_status'    => ['publish', 'draft', 'private'],
        ];

        if (is_array($lesson_order_map) && !empty($lesson_order_map)) {
            usort($lesson_ids, function ($a, $b) use ($lesson_order_map) {
                $order_a = isset($lesson_order_map[(string) $a]) ? $lesson_order_map[(string) $a] : 9999;
                $order_b = isset($lesson_order_map[(string) $b]) ? $lesson_order_map[(string) $b] : 9999;
                return $order_a - $order_b;
            });
            $query_args['post__in'] = $lesson_ids;
            $query_args['orderby'] = 'post__in';
        } else {
            // Fallback: respect menu_order (legacy ordering)
            $query_args['orderby'] = 'menu_order';
            $query_args['order']   = 'ASC';
        }

        // Obtener los posts de las lecciones usando los IDs
        $lessons = get_posts($query_args);

        if (empty($lessons)) {
            return $this->success_response(['lessons' => []]);
        }

        global $wpdb;
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
        $performance = [];

        foreach ($lessons as $lesson) {
            // Obtener quiz_ids de dos fuentes posibles
            $quiz_ids_meta = get_post_meta($lesson->ID, '_quiz_ids', true);
            $lesson_steps = get_post_meta($lesson->ID, '_lesson_steps', true);

            // Combinar quiz_ids de ambas fuentes
            $quiz_ids = [];

            // 1. Desde _quiz_ids (método legacy)
            if (is_array($quiz_ids_meta)) {
                $quiz_ids = array_merge($quiz_ids, $quiz_ids_meta);
            }

            // 2. Desde _lesson_steps (método actual)
            if (is_array($lesson_steps)) {
                foreach ($lesson_steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                        $quiz_ids[] = (int) $step['data']['quiz_id'];
                    }
                }
            }

            // Eliminar duplicados
            $quiz_ids = array_unique($quiz_ids);

            if (empty($quiz_ids)) {
                continue;
            }

            // Calcular el promedio del ÚLTIMO intento de cada quiz
            $last_attempts_scores = [];

            foreach ($quiz_ids as $quiz_id) {
                $query = $wpdb->prepare("
                    SELECT score
                    FROM {$attempts_table}
                    WHERE user_id = %d 
                    AND quiz_id = %d
                    AND status = 'completed'
                    ORDER BY end_time DESC
                    LIMIT 1
                ", $user_id, $quiz_id);

                $last_attempt = $wpdb->get_row($query);

                if ($last_attempt) {
                    $last_attempts_scores[] = (float) $last_attempt->score;
                }
            }

            // Calcular el promedio si hay intentos, sino poner 0
            $avg_score = !empty($last_attempts_scores)
                ? array_sum($last_attempts_scores) / count($last_attempts_scores)
                : 0;

            // Incluir TODAS las lecciones que tienen quizzes (aunque el usuario no haya completado ninguno)
            $performance[] = [
                'lesson_id' => $lesson->ID,
                'lesson_title' => $lesson->post_title,
                'avg_score' => round($avg_score, 2),
                'total_attempts' => count($last_attempts_scores),
                'quizzes_completed' => count($last_attempts_scores),
                'total_quizzes' => count($quiz_ids)
            ];
        }

        return $this->success_response(['lessons' => $performance]);
    }

    /**
     * Get weak spots (lowest performing quizzes)
     */
    public function get_weak_spots(WP_REST_Request $request)
    {
        $user_id = get_current_user_id();
        $course_id = $request->get_param('course_id');

        // ✅ CORRECTO: Obtener lesson_ids desde el CURSO
        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

        if (!is_array($lesson_ids) || empty($lesson_ids)) {
            return $this->success_response([]);
        }

        $lessons = $lesson_ids; // Ya son IDs, no necesitamos get_posts con fields => 'ids'

        $course_quiz_ids = [];
        foreach ($lessons as $lesson_id) {
            $q_ids = get_post_meta($lesson_id, '_quiz_ids', true);
            if (is_array($q_ids)) {
                $course_quiz_ids = array_merge($course_quiz_ids, $q_ids);
            }
        }

        if (empty($course_quiz_ids)) {
            return $this->success_response([]);
        }

        global $wpdb;
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

        // 🔥 Obtener el último intento de cada quiz y encontrar los más débiles
        $result = [];

        foreach ($course_quiz_ids as $quiz_id) {
            $last_attempt = $wpdb->get_row($wpdb->prepare("
                SELECT score, end_time as completed_at
                FROM {$attempts_table}
                WHERE user_id = %d 
                AND quiz_id = %d
                AND status = 'completed'
                ORDER BY end_time DESC
                LIMIT 1
            ", $user_id, $quiz_id));

            if ($last_attempt && (float) $last_attempt->score < 70) {
                $quiz = get_post($quiz_id);
                if ($quiz) {
                    $result[] = [
                        'quiz_id' => $quiz->ID,
                        'quiz_title' => $quiz->post_title,
                        'avg_score' => round((float) $last_attempt->score, 2),
                        'last_attempt_date' => $last_attempt->completed_at
                    ];
                }
            }
        }

        // Ordenar por score ascendente y tomar los 3 peores
        usort($result, function ($a, $b) {
            return $a['avg_score'] <=> $b['avg_score'];
        });

        $result = array_slice($result, 0, 3);

        return $this->success_response($result);
    }

    /**
     * Get difficulty statistics
     */
    public function get_difficulty_stats(WP_REST_Request $request)
    {
        $user_id = get_current_user_id();
        $course_id = $request->get_param('course_id');

        error_log("QE Debug: get_difficulty_stats called for user $user_id, course $course_id");

        global $wpdb;
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

        // Debug: Check if there are any answers for this user and course
        $debug_check = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) 
            FROM {$answers_table} a
            INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
            WHERE att.user_id = %d AND att.course_id = %d
        ", $user_id, $course_id));

        error_log("QE Debug: Total answers found for user $user_id course $course_id: $debug_check");

        // We need to join with term relationships to get difficulty
        // Assuming 'qe_difficulty' taxonomy for questions

        // Query to get the LATEST answer for each question and aggregate stats
        // Updated to use postmeta _difficulty_level instead of taxonomy
        $query = $wpdb->prepare("
            SELECT 
                pm.meta_value as difficulty,
                COUNT(DISTINCT a.question_id) as total_questions,
                SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
                SUM(CASE WHEN a.is_correct = 0 AND a.answer_given IS NOT NULL AND a.answer_given != '' THEN 1 ELSE 0 END) as incorrect_answers,
                SUM(CASE WHEN a.answer_given IS NULL OR a.answer_given = '' THEN 1 ELSE 0 END) as unanswered,
                SUM(CASE WHEN a.is_risked = 1 THEN 1 ELSE 0 END) as risked_answers,
                SUM(CASE WHEN a.is_risked = 1 AND a.is_correct = 1 THEN 1 ELSE 0 END) as risked_correct,
                SUM(CASE WHEN a.is_risked = 1 AND a.is_correct = 0 AND a.answer_given IS NOT NULL AND a.answer_given != '' THEN 1 ELSE 0 END) as risked_incorrect,
                SUM(CASE WHEN a.is_risked = 1 AND (a.answer_given IS NULL OR a.answer_given = '') THEN 1 ELSE 0 END) as risked_unanswered
            FROM {$answers_table} a
            INNER JOIN {$attempts_table} att ON a.attempt_id = att.attempt_id
            INNER JOIN {$wpdb->postmeta} pm ON a.question_id = pm.post_id
            WHERE att.user_id = %d 
            AND att.course_id = %d
            AND pm.meta_key = '_difficulty_level'
            AND a.attempt_id = (
                SELECT MAX(a2.attempt_id)
                FROM {$answers_table} a2
                INNER JOIN {$attempts_table} att2 ON a2.attempt_id = att2.attempt_id
                WHERE att2.user_id = att.user_id 
                AND a2.question_id = a.question_id
            )
            GROUP BY pm.meta_value
        ", $user_id, $course_id);

        $results = $wpdb->get_results($query);

        error_log("QE Debug: SQL Query Results: " . print_r($results, true));

        $stats = [];
        // Initialize with default values for standard difficulties
        foreach (['easy', 'medium', 'hard'] as $diff) {
            $stats[$diff] = [
                'total' => 0,
                'correct' => 0,
                'incorrect' => 0,
                'unanswered' => 0,
                'risked' => 0,
                'risked_correct' => 0,
                'risked_incorrect' => 0,
                'risked_unanswered' => 0,
                'percentage' => 0
            ];
        }

        if ($results) {
            foreach ($results as $row) {
                // Normalize difficulty name to lowercase key
                $raw_difficulty = strtolower($row->difficulty);
                $key = $raw_difficulty;

                // Map Spanish terms and other variations to English keys
                $map = [
                    'fácil' => 'easy',
                    'facil' => 'easy',
                    'beginner' => 'easy',
                    'medio' => 'medium',
                    'media' => 'medium',
                    'intermedio' => 'medium',
                    'intermediate' => 'medium',
                    'difícil' => 'hard',
                    'dificil' => 'hard',
                    'avanzado' => 'hard',
                    'advanced' => 'hard',
                    'experto' => 'hard'
                ];

                if (isset($map[$raw_difficulty])) {
                    $key = $map[$raw_difficulty];
                }

                // If the key doesn't exist (e.g. custom difficulty), initialize it
                if (!isset($stats[$key])) {
                    $stats[$key] = [
                        'total' => 0,
                        'correct' => 0,
                        'incorrect' => 0,
                        'unanswered' => 0,
                        'risked' => 0,
                        'risked_correct' => 0,
                        'risked_incorrect' => 0,
                        'risked_unanswered' => 0,
                        'percentage' => 0
                    ];
                }

                // Accumulate stats (in case multiple raw difficulties map to the same key)
                $stats[$key]['total'] += (int) $row->total_questions;
                $stats[$key]['correct'] += (int) $row->correct_answers;
                $stats[$key]['incorrect'] += (int) $row->incorrect_answers;
                $stats[$key]['unanswered'] += (int) $row->unanswered;
                $stats[$key]['risked'] += (int) $row->risked_answers;
                $stats[$key]['risked_correct'] += (int) $row->risked_correct;
                $stats[$key]['risked_incorrect'] += (int) $row->risked_incorrect;
                $stats[$key]['risked_unanswered'] += (int) $row->risked_unanswered;

                // Recalculate percentage
                if ($stats[$key]['total'] > 0) {
                    $stats[$key]['percentage'] = round(($stats[$key]['correct'] / $stats[$key]['total']) * 100, 1);


                }
            }
        }

        error_log("QE Debug: Final Stats: " . print_r($stats, true));

        return $this->success_response($stats);
    }

    /**
     * Get score evolution over time
     * 
     * Returns the user's score evolution for a course, grouped by time period
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_score_evolution(WP_REST_Request $request)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'qe_quiz_attempts';

        $user_id = get_current_user_id();
        $course_id = (int) $request->get_param('course_id');
        $lesson_id = $request->get_param('lesson_id'); // Optional filter
        $period = $request->get_param('period') ?: 'week';

        // If lesson_id is provided, only get quizzes from that lesson
        if ($lesson_id) {
            $all_quiz_ids = [];

            // Get from _quiz_ids meta
            $quiz_ids_meta = get_post_meta($lesson_id, '_quiz_ids', true);
            if (!empty($quiz_ids_meta) && is_array($quiz_ids_meta)) {
                $all_quiz_ids = array_merge($all_quiz_ids, $quiz_ids_meta);
            }

            // Get from _lesson_steps
            $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
            if (!empty($lesson_steps) && is_array($lesson_steps)) {
                foreach ($lesson_steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                        $all_quiz_ids[] = (int) $step['data']['quiz_id'];
                    }
                }
            }

            $all_quiz_ids = array_unique(array_filter($all_quiz_ids));
        } else {
            // Get lesson IDs for this course
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
            if (empty($lesson_ids)) {
                return $this->success_response([]);
            }

            // Get lessons
            $lessons = get_posts([
                'post_type' => 'qe_lesson',
                'include' => $lesson_ids,
                'posts_per_page' => -1,
                'post_status' => ['publish', 'draft', 'private'],
                'fields' => 'ids'
            ]);

            if (empty($lessons)) {
                return $this->success_response([]);
            }

            // Collect all quiz IDs from lessons
            $all_quiz_ids = [];
            foreach ($lessons as $lid) {
                // Get from _quiz_ids meta
                $quiz_ids_meta = get_post_meta($lid, '_quiz_ids', true);
                if (!empty($quiz_ids_meta) && is_array($quiz_ids_meta)) {
                    $all_quiz_ids = array_merge($all_quiz_ids, $quiz_ids_meta);
                }

                // Get from _lesson_steps
                $lesson_steps = get_post_meta($lid, '_lesson_steps', true);
                if (!empty($lesson_steps) && is_array($lesson_steps)) {
                    foreach ($lesson_steps as $step) {
                        if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                            $all_quiz_ids[] = (int) $step['data']['quiz_id'];
                        }
                    }
                }
            }

            $all_quiz_ids = array_unique(array_filter($all_quiz_ids));
        }

        if (empty($all_quiz_ids)) {
            return $this->success_response([]);
        }

        // Determine date filter based on period
        $date_filter = '';
        switch ($period) {
            case 'week':
                $date_filter = "AND end_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                break;
            case 'month':
                $date_filter = "AND end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                break;
            case 'all':
            default:
                $date_filter = '';
                break;
        }

        $quiz_ids_placeholder = implode(',', array_fill(0, count($all_quiz_ids), '%d'));

        // Get all completed attempts with quiz info
        $query = $wpdb->prepare("
            SELECT 
                quiz_id,
                score,
                end_time as completed_at,
                DATE(end_time) as date
            FROM {$table_name}
            WHERE user_id = %d
            AND quiz_id IN ({$quiz_ids_placeholder})
            AND status = 'completed'
            {$date_filter}
            ORDER BY quiz_id, end_time DESC
        ", array_merge([$user_id], $all_quiz_ids));

        $all_attempts = $wpdb->get_results($query);

        if (empty($all_attempts)) {
            return $this->success_response([]);
        }

        // Group ALL attempts by date (showing daily performance evolution)
        $scores_by_date = [];
        foreach ($all_attempts as $attempt) {
            $date = $attempt->date;
            if (!isset($scores_by_date[$date])) {
                $scores_by_date[$date] = [];
            }
            $scores_by_date[$date][] = (float) $attempt->score;
        }

        // Calculate average score per date
        $evolution = [];
        foreach ($scores_by_date as $date => $scores) {
            $avg_score = array_sum($scores) / count($scores);
            $evolution[] = [
                'date' => $date,
                'score' => round($avg_score, 2),
                'attempts' => count($scores)
            ];
        }

        // Sort by date
        usort($evolution, function ($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return $this->success_response($evolution);
    }
}

// Initialize
new QE_User_Stats_API();
