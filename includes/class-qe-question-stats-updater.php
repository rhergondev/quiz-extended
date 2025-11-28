<?php
/**
 * QE_Question_Stats_Updater Class
 *
 * Handles incremental updates to user_question_stats table
 * when a quiz is submitted.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Question_Stats_Updater
{
    /**
     * Initialize hooks
     */
    public static function init()
    {
        // Hook into quiz submission
        add_action('qe_quiz_attempt_submitted', [__CLASS__, 'update_user_question_stats'], 20, 3);
    }

    /**
     * Update user question stats after quiz submission
     * 
     * This method is called AFTER a quiz is submitted.
     * It updates ONLY the questions from that specific attempt.
     * 
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @param array $grading_result Results from grading
     */
    public static function update_user_question_stats($user_id, $quiz_id, $grading_result)
    {
        global $wpdb;

        $stats_table = $wpdb->prefix . 'qe_user_question_stats';
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

        // Check if stats table exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$stats_table'");
        if (!$table_exists) {
            error_log("QE Stats Updater: Table $stats_table does not exist. Skipping update.");
            return;
        }

        // Get the attempt info
        $attempt = isset($grading_result['attempt_id']) ? $grading_result['attempt_id'] : null;

        // If no attempt_id in grading_result, get the latest attempt
        if (!$attempt) {
            $attempt = $wpdb->get_row($wpdb->prepare("
                SELECT attempt_id, course_id, lesson_id, quiz_id
                FROM {$attempts_table}
                WHERE user_id = %d AND quiz_id = %d AND status = 'completed'
                ORDER BY end_time DESC
                LIMIT 1
            ", $user_id, $quiz_id));

            if (!$attempt) {
                error_log("QE Stats Updater: No completed attempt found for user $user_id, quiz $quiz_id");
                return;
            }

            $attempt_id = $attempt->attempt_id;
            $course_id = $attempt->course_id;
            $lesson_id = $attempt->lesson_id;
        } else {
            $attempt_id = $attempt;
            // Get course/lesson from attempt
            $attempt_data = $wpdb->get_row($wpdb->prepare("
                SELECT course_id, lesson_id FROM {$attempts_table} WHERE attempt_id = %d
            ", $attempt_id));
            $course_id = $attempt_data ? $attempt_data->course_id : 0;
            $lesson_id = $attempt_data ? $attempt_data->lesson_id : 0;
        }

        // Get all answers from this attempt
        // Note: attempt_answers doesn't have created_at, we'll use the attempt's end_time
        $answers = $wpdb->get_results($wpdb->prepare("
            SELECT ans.question_id, ans.answer_given, ans.is_correct, ans.is_risked, att.end_time as answered_at
            FROM {$answers_table} ans
            INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
            WHERE ans.attempt_id = %d
        ", $attempt_id));

        if (empty($answers)) {
            return;
        }

        $updated_count = 0;
        $error_count = 0;

        foreach ($answers as $answer) {
            try {
                // Determine answer status
                $answer_given = $answer->answer_given;
                $is_correct = (int) $answer->is_correct;
                $is_risked = (int) $answer->is_risked;

                if ($answer_given === null || $answer_given === '') {
                    $status = 'unanswered';
                } elseif ($is_correct) {
                    $status = $is_risked ? 'correct_with_risk' : 'correct_without_risk';
                } else {
                    $status = $is_risked ? 'incorrect_with_risk' : 'incorrect_without_risk';
                }

                // Get question difficulty
                $difficulty = get_post_meta($answer->question_id, '_difficulty', true);
                if (empty($difficulty)) {
                    $difficulty = 'medium';
                }

                // Get historical counts for this user+question
                $existing = $wpdb->get_row($wpdb->prepare("
                    SELECT times_answered, times_correct, times_incorrect
                    FROM {$stats_table}
                    WHERE user_id = %d AND question_id = %d
                ", $user_id, $answer->question_id));

                $times_answered = $existing ? (int) $existing->times_answered + 1 : 1;
                $times_correct = $existing ? (int) $existing->times_correct : 0;
                $times_incorrect = $existing ? (int) $existing->times_incorrect : 0;

                if ($is_correct) {
                    $times_correct++;
                } elseif ($answer_given !== null && $answer_given !== '') {
                    $times_incorrect++;
                }

                // Insert or update
                $result = $wpdb->query($wpdb->prepare(
                    "
                    INSERT INTO {$stats_table} 
                    (user_id, question_id, course_id, quiz_id, lesson_id, difficulty, 
                     last_answer_status, is_correct, is_risked, answer_given, 
                     last_attempt_id, last_answered_at, times_answered, times_correct, times_incorrect)
                    VALUES (%d, %d, %d, %d, %d, %s, %s, %d, %d, %s, %d, %s, %d, %d, %d)
                    ON DUPLICATE KEY UPDATE
                        course_id = VALUES(course_id),
                        quiz_id = VALUES(quiz_id),
                        lesson_id = VALUES(lesson_id),
                        difficulty = VALUES(difficulty),
                        last_answer_status = VALUES(last_answer_status),
                        is_correct = VALUES(is_correct),
                        is_risked = VALUES(is_risked),
                        answer_given = VALUES(answer_given),
                        last_attempt_id = VALUES(last_attempt_id),
                        last_answered_at = VALUES(last_answered_at),
                        times_answered = VALUES(times_answered),
                        times_correct = VALUES(times_correct),
                        times_incorrect = VALUES(times_incorrect),
                        updated_at = NOW()
                ",
                    $user_id,
                    $answer->question_id,
                    $course_id ?: 0,
                    $quiz_id ?: 0,
                    $lesson_id ?: 0,
                    $difficulty,
                    $status,
                    $is_correct,
                    $is_risked,
                    $answer_given,
                    $attempt_id,
                    $answer->answered_at ?: current_time('mysql'),
                    $times_answered,
                    $times_correct,
                    $times_incorrect
                ));

                if ($result !== false) {
                    $updated_count++;
                } else {
                    $error_count++;
                    error_log("QE Stats Updater Error: " . $wpdb->last_error);
                }

            } catch (Exception $e) {
                $error_count++;
                error_log("QE Stats Updater Exception: " . $e->getMessage());
            }
        }

        error_log("QE Stats Updater: Updated $updated_count question stats for user $user_id (errors: $error_count)");
    }
}

// Initialize
QE_Question_Stats_Updater::init();
