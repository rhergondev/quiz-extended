<?php
/**
 * QE_Ghost_Users_API Class
 *
 * Handles ghost users for course rankings baseline.
 * These users simulate course activity for demonstration purposes.
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

class QE_Ghost_Users_API extends QE_API_Base
{
    /**
     * Target averages by difficulty
     * These are the target group averages we want to achieve
     */
    private $target_averages = [
        'without_risk' => [
            'facil' => 5.8,
            'medio' => 5.0,
            'dificil' => 4.3,
            'default' => 5.0, // fallback
        ],
        'with_risk' => [
            'facil' => 6.2,
            'medio' => 5.4,
            'dificil' => 4.8,
            'default' => 5.4, // fallback
        ],
    ];

    /**
     * Spanish first names for ghost users
     */
    private $first_names = [
        'María',
        'Carmen',
        'Ana',
        'Laura',
        'Lucía',
        'Paula',
        'Elena',
        'Sara',
        'Marta',
        'Cristina',
        'Patricia',
        'Isabel',
        'Sofía',
        'Andrea',
        'Raquel',
        'Alba',
        'Silvia',
        'Beatriz',
        'Nuria',
        'Rosa',
        'Carlos',
        'Manuel',
        'José',
        'Antonio',
        'David',
        'Francisco',
        'Javier',
        'Daniel',
        'Miguel',
        'Rafael',
        'Pedro',
        'Pablo',
        'Alejandro',
        'Fernando',
        'Jorge',
        'Luis',
        'Alberto',
        'Sergio',
        'Andrés',
        'Juan'
    ];

    /**
     * Spanish last names for ghost users
     */
    private $last_names = [
        'García',
        'Rodríguez',
        'Martínez',
        'López',
        'González',
        'Hernández',
        'Pérez',
        'Sánchez',
        'Ramírez',
        'Torres',
        'Flores',
        'Rivera',
        'Gómez',
        'Díaz',
        'Reyes',
        'Moreno',
        'Jiménez',
        'Ruiz',
        'Álvarez',
        'Romero',
        'Alonso',
        'Navarro',
        'Domínguez',
        'Vázquez',
        'Ramos',
        'Gil',
        'Serrano',
        'Blanco',
        'Molina',
        'Morales',
        'Suárez',
        'Ortega',
        'Delgado',
        'Castro',
        'Ortiz',
        'Rubio',
        'Marín',
        'Sanz',
        'Iglesias',
        'Gutiérrez'
    ];

    /**
     * Register routes
     */
    public function register_routes()
    {
        // Generate ghost users for a course
        register_rest_route($this->namespace, '/ghost-users/generate', [
            'methods' => 'POST',
            'callback' => [$this, 'generate_ghost_users'],
            'permission_callback' => [$this, 'check_admin_permission'],
            'args' => [
                'course_id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint',
                ],
                'count' => [
                    'required' => false,
                    'type' => 'integer',
                    'default' => 20,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        // Get ghost users for a course
        register_rest_route($this->namespace, '/ghost-users/(?P<course_id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_ghost_users'],
            'permission_callback' => [$this, 'check_admin_permission'],
            'args' => [
                'course_id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        // Delete ghost users for a course
        register_rest_route($this->namespace, '/ghost-users/(?P<course_id>\d+)', [
            'methods' => 'DELETE',
            'callback' => [$this, 'delete_ghost_users'],
            'permission_callback' => [$this, 'check_admin_permission'],
            'args' => [
                'course_id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);
    }

    /**
     * Check if user has admin permissions
     */
    public function check_admin_permission()
    {
        return current_user_can('manage_options');
    }

    /**
     * Generate ghost users for a course
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function generate_ghost_users(WP_REST_Request $request)
    {
        $course_id = $request->get_param('course_id');
        $count = min($request->get_param('count'), 50); // Max 50 users

        // Verify course exists
        $course = get_post($course_id);
        if (!$course || $course->post_type !== 'qe_course') {
            return new WP_Error('invalid_course', 'Curso no encontrado', ['status' => 404]);
        }

        // Get quizzes for this course
        $quizzes = $this->get_course_quizzes($course_id);
        if (empty($quizzes)) {
            return new WP_Error('no_quizzes', 'El curso no tiene cuestionarios asignados', ['status' => 400]);
        }

        $created_users = [];
        $errors = [];

        // Pre-calculate score distributions to achieve target averages
        $score_distributions = $this->calculate_score_distributions($quizzes, $count);

        for ($i = 0; $i < $count; $i++) {
            // Get the pre-calculated scores for this user index
            $user_scores = $score_distributions[$i] ?? null;
            $result = $this->create_ghost_user($course_id, $quizzes, $user_scores);
            if (is_wp_error($result)) {
                $errors[] = $result->get_error_message();
            } else {
                $created_users[] = $result;
            }
        }

        // Aggregate quiz statistics across all users
        $total_quiz_attempts = 0;
        $successful_quiz_attempts = 0;
        $failed_quiz_attempts = 0;
        $quiz_error_summary = [];

        foreach ($created_users as $user) {
            $total_quiz_attempts += $user['total_quizzes'] ?? 0;
            $successful_quiz_attempts += $user['successful_quizzes'] ?? 0;
            $failed_quiz_attempts += $user['failed_quizzes'] ?? 0;

            // Aggregate quiz errors by quiz_id to avoid duplicates
            if (!empty($user['quiz_errors'])) {
                foreach ($user['quiz_errors'] as $quiz_error) {
                    $quiz_id = $quiz_error['quiz_id'];
                    if (!isset($quiz_error_summary[$quiz_id])) {
                        $quiz_error_summary[$quiz_id] = [
                            'quiz_id' => $quiz_id,
                            'quiz_title' => $quiz_error['quiz_title'],
                            'error' => $quiz_error['error'],
                            'error_code' => $quiz_error['error_code'],
                            'affected_users' => 0,
                        ];
                    }
                    $quiz_error_summary[$quiz_id]['affected_users']++;
                }
            }
        }

        return $this->success_response([
            'created_count' => count($created_users),
            'users' => $created_users,
            'errors' => $errors,
            'quiz_statistics' => [
                'total_quizzes_in_course' => count($quizzes),
                'total_attempts_expected' => count($quizzes) * count($created_users),
                'successful_attempts' => $successful_quiz_attempts,
                'failed_attempts' => $failed_quiz_attempts,
            ],
            'quiz_errors' => array_values($quiz_error_summary),
        ]);
    }

    /**
     * Calculate score distributions for all users to achieve target averages
     *
     * @param array $quizzes List of quizzes
     * @param int $user_count Number of users to generate
     * @return array Score targets for each user
     */
    private function calculate_score_distributions($quizzes, $user_count)
    {
        $distributions = [];

        foreach ($quizzes as $quiz) {
            $quiz_id = $quiz['id'];
            $difficulty = $this->get_quiz_difficulty($quiz_id);

            // Get target averages for this difficulty
            $target_without_risk = $this->target_averages['without_risk'][$difficulty] ?? $this->target_averages['without_risk']['default'];
            $target_with_risk = $this->target_averages['with_risk'][$difficulty] ?? $this->target_averages['with_risk']['default'];

            // Generate scores that average to target
            // Use normal-like distribution around the target
            $scores_without_risk = $this->generate_scores_for_target($target_without_risk, $user_count, 2.5, 8.0);
            $scores_with_risk = $this->generate_scores_for_target($target_with_risk, $user_count, 3.0, 8.0);

            // Assign scores to each user
            for ($i = 0; $i < $user_count; $i++) {
                if (!isset($distributions[$i])) {
                    $distributions[$i] = [];
                }
                $distributions[$i][$quiz_id] = [
                    'without_risk' => $scores_without_risk[$i],
                    'with_risk' => $scores_with_risk[$i],
                ];
            }
        }

        return $distributions;
    }

    /**
     * Generate an array of scores that average to the target
     *
     * @param float $target Target average
     * @param int $count Number of scores to generate
     * @param float $min Minimum score
     * @param float $max Maximum score (default 8.0)
     * @return array Array of scores
     */
    private function generate_scores_for_target($target, $count, $min = 2.5, $max = 8.0)
    {
        $scores = [];
        $target_sum = $target * $count;
        $current_sum = 0;

        // Generate n-1 scores with variance
        for ($i = 0; $i < $count - 1; $i++) {
            // Calculate how much room we have left
            $remaining_count = $count - $i;
            $remaining_sum = $target_sum - $current_sum;
            $needed_average = $remaining_sum / $remaining_count;

            // Add some variance but keep it realistic
            $variance = $this->random_float(-1.5, 1.5);
            $score = $needed_average + $variance;

            // Clamp to valid range
            $score = max($min, min($max, $score));

            $scores[] = round($score, 2);
            $current_sum += $score;
        }

        // Last score is calculated to hit exact target (with clamping)
        $last_score = $target_sum - $current_sum;
        $last_score = max($min, min($max, $last_score));
        $scores[] = round($last_score, 2);

        // Shuffle so the "adjusted" score isn't always last
        shuffle($scores);

        return $scores;
    }

    /**
     * Get ghost users for a course
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_ghost_users(WP_REST_Request $request)
    {
        $course_id = $request->get_param('course_id');

        global $wpdb;

        // Get all ghost users enrolled in this course
        $ghost_users = $wpdb->get_results($wpdb->prepare(
            "SELECT u.ID, u.display_name, u.user_email, um2.meta_value as enrollment_date
             FROM {$wpdb->users} u
             INNER JOIN {$wpdb->usermeta} um1 ON u.ID = um1.user_id 
                AND um1.meta_key = '_qe_ghost_user' AND um1.meta_value = '1'
             INNER JOIN {$wpdb->usermeta} um2 ON u.ID = um2.user_id 
                AND um2.meta_key = %s
             ORDER BY u.display_name ASC",
            "_enrolled_course_{$course_id}"
        ));

        // Get quiz attempts count for each user
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
        foreach ($ghost_users as &$user) {
            $user->attempts_count = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$attempts_table} WHERE user_id = %d AND course_id = %d",
                $user->ID,
                $course_id
            ));
        }

        return $this->success_response([
            'count' => count($ghost_users),
            'users' => $ghost_users,
        ]);
    }

    /**
     * Delete ghost users for a course
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function delete_ghost_users(WP_REST_Request $request)
    {
        $course_id = $request->get_param('course_id');

        global $wpdb;

        // Get all ghost user IDs for this course
        $ghost_user_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT u.ID
             FROM {$wpdb->users} u
             INNER JOIN {$wpdb->usermeta} um1 ON u.ID = um1.user_id 
                AND um1.meta_key = '_qe_ghost_user' AND um1.meta_value = '1'
             INNER JOIN {$wpdb->usermeta} um2 ON u.ID = um2.user_id 
                AND um2.meta_key = %s",
            "_enrolled_course_{$course_id}"
        ));

        if (empty($ghost_user_ids)) {
            return $this->success_response([
                'deleted_count' => 0,
                'message' => 'No hay usuarios fantasma para eliminar',
            ]);
        }

        $deleted_count = 0;
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';
        $rankings_table = $wpdb->prefix . 'qe_user_rankings';
        $progress_table = $wpdb->prefix . 'qe_student_progress';

        foreach ($ghost_user_ids as $user_id) {
            // Delete quiz attempt answers
            $attempt_ids = $wpdb->get_col($wpdb->prepare(
                "SELECT attempt_id FROM {$attempts_table} WHERE user_id = %d",
                $user_id
            ));

            if (!empty($attempt_ids)) {
                $placeholders = implode(',', array_fill(0, count($attempt_ids), '%d'));
                $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$answers_table} WHERE attempt_id IN ($placeholders)",
                    $attempt_ids
                ));
            }

            // Delete quiz attempts
            $wpdb->delete($attempts_table, ['user_id' => $user_id], ['%d']);

            // Delete rankings
            $wpdb->delete($rankings_table, ['user_id' => $user_id], ['%d']);

            // Delete progress
            $wpdb->delete($progress_table, ['user_id' => $user_id], ['%d']);

            // Check if this ghost user is enrolled in other courses
            $other_enrollments = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->usermeta} 
                 WHERE user_id = %d 
                 AND meta_key LIKE '_enrolled_course_%%'
                 AND meta_key NOT LIKE '_enrolled_course_%%_date'
                 AND meta_key != %s",
                $user_id,
                "_enrolled_course_{$course_id}"
            ));

            if ($other_enrollments > 0) {
                // Just unenroll from this course
                delete_user_meta($user_id, "_enrolled_course_{$course_id}");
                delete_user_meta($user_id, "_enrolled_course_{$course_id}_date");
                delete_user_meta($user_id, "_course_{$course_id}_progress");
            } else {
                // Delete the user completely
                require_once(ABSPATH . 'wp-admin/includes/user.php');
                wp_delete_user($user_id);
            }

            $deleted_count++;
        }

        return $this->success_response([
            'deleted_count' => $deleted_count,
            'message' => "Se eliminaron {$deleted_count} usuarios fantasma",
        ]);
    }

    /**
     * Create a single ghost user
     *
     * @param int $course_id
     * @param array $quizzes
     * @param array|null $score_targets Pre-calculated score targets for this user
     * @return array|WP_Error
     */
    private function create_ghost_user($course_id, $quizzes, $score_targets = null)
    {
        // Generate random name
        $first_name = $this->first_names[array_rand($this->first_names)];
        $last_name = $this->last_names[array_rand($this->last_names)];
        $display_name = $first_name . ' ' . $last_name;

        // Generate unique username and email
        $base_username = sanitize_user(strtolower($first_name . '.' . $last_name));
        $username = $base_username . '_ghost_' . wp_generate_password(4, false);
        $email = $username . '@ghost.local';

        // Create WordPress user
        $user_id = wp_insert_user([
            'user_login' => $username,
            'user_email' => $email,
            'user_pass' => wp_generate_password(16, true),
            'display_name' => $display_name,
            'first_name' => $first_name,
            'last_name' => $last_name,
            'role' => 'subscriber',
        ]);

        if (is_wp_error($user_id)) {
            return $user_id;
        }

        // Mark as ghost user
        update_user_meta($user_id, '_qe_ghost_user', '1');
        update_user_meta($user_id, '_qe_ghost_course_origin', $course_id);

        // Enroll in course
        $enrollment_date = $this->get_random_past_date(30, 90);
        update_user_meta($user_id, "_enrolled_course_{$course_id}", 'yes');
        update_user_meta($user_id, "_enrolled_course_{$course_id}_date", $enrollment_date);
        update_user_meta($user_id, "_course_{$course_id}_progress", 100);

        // Complete all quizzes with pre-calculated scores
        $quiz_results = [];
        $quiz_errors = [];
        foreach ($quizzes as $quiz) {
            $result = $this->create_quiz_attempt($user_id, $course_id, $quiz, $score_targets);
            if (is_wp_error($result)) {
                $quiz_errors[] = [
                    'quiz_id' => $quiz['id'],
                    'quiz_title' => $quiz['title'] ?? 'Sin título',
                    'error' => $result->get_error_message(),
                    'error_code' => $result->get_error_code(),
                ];
            } else {
                $quiz_results[] = $result;
            }
        }

        // Update rankings
        $this->update_ghost_user_ranking($user_id, $course_id, $quiz_results);

        return [
            'id' => $user_id,
            'display_name' => $display_name,
            'email' => $email,
            'quiz_results' => $quiz_results,
            'quiz_errors' => $quiz_errors,
            'total_quizzes' => count($quizzes),
            'successful_quizzes' => count($quiz_results),
            'failed_quizzes' => count($quiz_errors),
        ];
    }

    /**
     * Create a quiz attempt for a ghost user
     *
     * @param int $user_id
     * @param int $course_id
     * @param array $quiz
     * @param array $score_targets Target scores for this user (passed from parent)
     * @return array|WP_Error
     */
    private function create_quiz_attempt($user_id, $course_id, $quiz, $score_targets = null)
    {
        global $wpdb;

        $quiz_id = $quiz['id'];
        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

        if (empty($question_ids) || !is_array($question_ids)) {
            return new WP_Error('no_questions', "Quiz {$quiz_id} no tiene preguntas");
        }

        $total_questions = count($question_ids);

        // Get quiz difficulty from taxonomy
        $difficulty = $this->get_quiz_difficulty($quiz_id);

        // Use pre-calculated target scores or generate new ones
        if ($score_targets && isset($score_targets[$quiz_id])) {
            $score_without_risk = $score_targets[$quiz_id]['without_risk'];
            $score_with_risk = $score_targets[$quiz_id]['with_risk'];
        } else {
            // Fallback to old behavior if no targets provided
            $target_without_risk = $this->target_averages['without_risk'][$difficulty] ?? $this->target_averages['without_risk']['default'];
            $target_with_risk = $this->target_averages['with_risk'][$difficulty] ?? $this->target_averages['with_risk']['default'];

            // Add variance
            $score_without_risk = $this->random_float(max(3.0, $target_without_risk - 1.5), min(8.0, $target_without_risk + 1.5));
            $score_with_risk = $this->random_float(max(3.5, $target_with_risk - 1.5), min(8.0, $target_with_risk + 1.5));
        }

        // Calculate how many questions to answer correctly based on score_without_risk
        $correct_ratio = $score_without_risk / 10;
        $correct_answers = round($total_questions * $correct_ratio);
        $incorrect_answers = $total_questions - $correct_answers;

        // Determine passing
        $passing_score = absint(get_post_meta($quiz_id, '_passing_score', true) ?: 5);
        if ($passing_score > 10) {
            $passing_score = $passing_score / 10;
        }
        $passed = $score_with_risk >= $passing_score;

        // Create attempt record
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
        $attempt_date = $this->get_random_past_date(1, 30);
        $time_taken = rand(300, 1800); // 5-30 minutes

        $wpdb->insert($attempts_table, [
            'user_id' => $user_id,
            'quiz_id' => $quiz_id,
            'course_id' => $course_id,
            'lesson_id' => $quiz['lesson_id'] ?? null,
            'score' => round($score_without_risk, 2),
            'score_with_risk' => round($score_with_risk, 2),
            'status' => 'completed',
            'start_time' => $attempt_date,
            'end_time' => date('Y-m-d H:i:s', strtotime($attempt_date) + $time_taken),
            'time_taken_seconds' => $time_taken,
        ], ['%d', '%d', '%d', '%d', '%f', '%f', '%s', '%s', '%s', '%d']);

        $attempt_id = $wpdb->insert_id;

        if (!$attempt_id) {
            return new WP_Error('insert_failed', 'No se pudo crear el intento');
        }

        // Create answer records
        $this->create_attempt_answers($attempt_id, $question_ids, $correct_answers, $incorrect_answers);

        // Fire the quiz attempt submitted hook to update stats tables
        // This ensures ghost user attempts are included in pre-calculated stats
        $grading_result = [
            'score' => round($score_without_risk, 2),
            'score_with_risk' => round($score_with_risk, 2),
            'passed' => $passed,
            'total_questions' => count($question_ids),
            'correct_answers' => $correct_answers,
            'attempt_id' => $attempt_id,
        ];
        do_action('qe_quiz_attempt_submitted', $user_id, $quiz_id, $grading_result);

        return [
            'quiz_id' => $quiz_id,
            'quiz_title' => $quiz['title'],
            'attempt_id' => $attempt_id,
            'score' => round($score_without_risk, 2),
            'score_with_risk' => round($score_with_risk, 2),
            'passed' => $passed,
            'difficulty' => $difficulty,
        ];
    }

    /**
     * Get quiz difficulty from taxonomy
     *
     * @param int $quiz_id
     * @return string 'facil', 'medio', 'dificil' or 'default'
     */
    private function get_quiz_difficulty($quiz_id)
    {
        // First try taxonomy 'qe_difficulty'
        $terms = wp_get_post_terms($quiz_id, 'qe_difficulty', ['fields' => 'slugs']);

        if (!is_wp_error($terms) && !empty($terms)) {
            $difficulty = strtolower($terms[0]);
        } else {
            // Fallback to meta field '_difficulty_level'
            $difficulty = get_post_meta($quiz_id, '_difficulty_level', true);
            $difficulty = strtolower($difficulty ?: '');
        }

        if (empty($difficulty)) {
            return 'default';
        }

        // Map common variations to our standard keys
        $difficulty_map = [
            'facil' => 'facil',
            'fácil' => 'facil',
            'easy' => 'facil',
            'low' => 'facil',
            'bajo' => 'facil',
            'medio' => 'medio',
            'medium' => 'medio',
            'intermedio' => 'medio',
            'normal' => 'medio',
            'dificil' => 'dificil',
            'difícil' => 'dificil',
            'hard' => 'dificil',
            'difficult' => 'dificil',
            'alto' => 'dificil',
            'high' => 'dificil',
        ];

        return $difficulty_map[$difficulty] ?? 'default';
    }

    /**
     * Create answer records for an attempt
     *
     * @param int $attempt_id
     * @param array $question_ids
     * @param int $correct_count
     * @param int $incorrect_count
     */
    private function create_attempt_answers($attempt_id, $question_ids, $correct_count, $incorrect_count)
    {
        global $wpdb;
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';

        // Shuffle questions and decide which are correct
        shuffle($question_ids);

        foreach ($question_ids as $index => $question_id) {
            $is_correct = $index < $correct_count;

            // Get question options
            $options = get_post_meta($question_id, '_question_options', true);
            if (!is_array($options) || empty($options)) {
                continue; // Skip questions without options
            }

            // Find correct option ID (not index!)
            $correct_option_id = null;
            $wrong_option_ids = [];

            foreach ($options as $option) {
                if (!empty($option['isCorrect'])) {
                    $correct_option_id = isset($option['id']) ? $option['id'] : null;
                } else {
                    if (isset($option['id'])) {
                        $wrong_option_ids[] = $option['id'];
                    }
                }
            }

            // If no correct option found, skip this question
            if ($correct_option_id === null) {
                continue;
            }

            // Determine which answer to record (using option ID, not index)
            if ($is_correct) {
                $selected_option_id = $correct_option_id;
                $with_risk = (rand(0, 100) < 30); // 30% answered with risk even if correct
            } else {
                // Select a wrong answer
                if (!empty($wrong_option_ids)) {
                    $selected_option_id = $wrong_option_ids[array_rand($wrong_option_ids)];
                } else {
                    // No wrong options available, use correct one (rare edge case)
                    $selected_option_id = $correct_option_id;
                }
                $with_risk = (rand(0, 100) < 60); // 60% of wrong answers were with risk
            }

            $wpdb->insert($answers_table, [
                'attempt_id' => $attempt_id,
                'question_id' => $question_id,
                'answer_given' => (string) $selected_option_id,
                'is_correct' => $is_correct ? 1 : 0,
                'is_risked' => $with_risk ? 1 : 0,
            ], ['%d', '%d', '%s', '%d', '%d']);
        }
    }    /**
         * Update ghost user ranking
         *
         * @param int $user_id
         * @param int $course_id
         * @param array $quiz_results
         */
    private function update_ghost_user_ranking($user_id, $course_id, $quiz_results)
    {
        if (empty($quiz_results)) {
            return;
        }

        global $wpdb;
        $rankings_table = $wpdb->prefix . 'qe_user_rankings';

        // Calculate average scores
        $total_score = 0;
        $total_score_with_risk = 0;
        $count = count($quiz_results);

        foreach ($quiz_results as $result) {
            $total_score += $result['score'];
            $total_score_with_risk += $result['score_with_risk'];
        }

        $avg_score = $total_score / $count;
        $avg_score_with_risk = $total_score_with_risk / $count;

        // Insert or update ranking
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$rankings_table} WHERE user_id = %d AND course_id = %d",
            $user_id,
            $course_id
        ));

        if ($existing) {
            $wpdb->update($rankings_table, [
                'average_score' => round($avg_score, 2),
                'average_score_with_risk' => round($avg_score_with_risk, 2),
                'quizzes_completed' => $count,
                'updated_at' => current_time('mysql'),
            ], ['id' => $existing], ['%f', '%f', '%d', '%s'], ['%d']);
        } else {
            $wpdb->insert($rankings_table, [
                'user_id' => $user_id,
                'course_id' => $course_id,
                'average_score' => round($avg_score, 2),
                'average_score_with_risk' => round($avg_score_with_risk, 2),
                'quizzes_completed' => $count,
                'created_at' => current_time('mysql'),
                'updated_at' => current_time('mysql'),
            ], ['%d', '%d', '%f', '%f', '%d', '%s', '%s']);
        }
    }

    /**
     * Get all quizzes for a course
     *
     * @param int $course_id
     * @return array
     */
    private function get_course_quizzes($course_id)
    {
        $quizzes = [];

        // Get lessons for the course
        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
        if (!is_array($lesson_ids)) {
            $lesson_ids = [];
        }

        // Get quizzes from each lesson
        foreach ($lesson_ids as $lesson_id) {
            // Method 1: Check _quiz_ids meta (legacy)
            $quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
            if (is_array($quiz_ids)) {
                foreach ($quiz_ids as $quiz_id) {
                    $quiz = get_post($quiz_id);
                    if ($quiz && $quiz->post_type === 'qe_quiz') {
                        $quizzes[] = [
                            'id' => $quiz_id,
                            'title' => $quiz->post_title,
                            'lesson_id' => $lesson_id,
                        ];
                    }
                }
            }

            // Method 2: Check _lesson_steps meta (new structure)
            $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
            if (!empty($lesson_steps) && is_array($lesson_steps)) {
                foreach ($lesson_steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                        $quiz_id = (int) $step['data']['quiz_id'];
                        // Check if already added
                        $already_added = array_filter($quizzes, function ($q) use ($quiz_id) {
                            return $q['id'] == $quiz_id;
                        });
                        if (empty($already_added)) {
                            $quiz = get_post($quiz_id);
                            if ($quiz && $quiz->post_type === 'qe_quiz') {
                                $quizzes[] = [
                                    'id' => $quiz_id,
                                    'title' => $quiz->post_title,
                                    'lesson_id' => $lesson_id,
                                ];
                            }
                        }
                    }
                }
            }
        }

        // Also check for quizzes directly associated with course
        $direct_quiz_ids = get_post_meta($course_id, '_quiz_ids', true);
        if (is_array($direct_quiz_ids)) {
            foreach ($direct_quiz_ids as $quiz_id) {
                // Check if already added
                $already_added = array_filter($quizzes, function ($q) use ($quiz_id) {
                    return $q['id'] == $quiz_id;
                });
                if (empty($already_added)) {
                    $quiz = get_post($quiz_id);
                    if ($quiz && $quiz->post_type === 'qe_quiz') {
                        $quizzes[] = [
                            'id' => $quiz_id,
                            'title' => $quiz->post_title,
                            'lesson_id' => null,
                        ];
                    }
                }
            }
        }

        return $quizzes;
    }

    /**
     * Generate a random past date
     *
     * @param int $min_days Minimum days ago
     * @param int $max_days Maximum days ago
     * @return string MySQL datetime
     */
    private function get_random_past_date($min_days, $max_days)
    {
        $days_ago = rand($min_days, $max_days);
        $timestamp = strtotime("-{$days_ago} days");
        // Add random hours
        $timestamp += rand(0, 86400);
        return date('Y-m-d H:i:s', $timestamp);
    }

    /**
     * Generate a random float between min and max
     *
     * @param float $min
     * @param float $max
     * @return float
     */
    private function random_float($min, $max)
    {
        return $min + mt_rand() / mt_getrandmax() * ($max - $min);
    }
}

// Initialize
new QE_Ghost_Users_API();
