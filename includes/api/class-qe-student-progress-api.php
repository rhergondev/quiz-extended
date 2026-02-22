<?php
/**
 * QE_Student_Progress_API Class
 *
 * Handles student progress tracking and favorite questions.
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

class QE_Student_Progress_API extends QE_API_Base
{
    /**
     * Register routes
     */
    public function register_routes()
    {
        // Mark content complete
        $this->register_secure_route(
            '/student-progress/mark-complete',
            WP_REST_Server::CREATABLE,
            'mark_content_complete',
            [
                'validation_schema' => [
                    'content_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'content_type' => [
                        'required' => true,
                        'type' => 'string',
                        'enum' => ['lesson', 'quiz', 'video', 'document', 'text', 'image', 'step']
                    ],
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'parent_lesson_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'step_index' => [
                        'required' => false,
                        'type' => 'integer',
                        'minimum' => 0
                    ]
                ]
            ]
        );

        // Unmark content (remove completion)
        $this->register_secure_route(
            '/student-progress/unmark-complete',
            WP_REST_Server::CREATABLE,
            'unmark_content_complete',
            [
                'validation_schema' => [
                    'content_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'content_type' => [
                        'required' => true,
                        'type' => 'string',
                        'enum' => ['lesson', 'quiz', 'video', 'document', 'text', 'image', 'step']
                    ],
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'parent_lesson_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'minimum' => 1
                    ],
                    'step_index' => [
                        'required' => false,
                        'type' => 'integer',
                        'minimum' => 0
                    ]
                ]
            ]
        );

        // Get course progress
        $this->register_secure_route(
            '/student-progress/course/(?P<course_id>\d+)',
            WP_REST_Server::READABLE,
            'get_course_progress',
            [
                'validation_schema' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ]
                ]
            ]
        );

        // Get completed content for a course
        $this->register_secure_route(
            '/student-progress/completed/(?P<course_id>\d+)',
            WP_REST_Server::READABLE,
            'get_completed_content',
            [
                'validation_schema' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ]
                ]
            ]
        );

        // Toggle favorite question
        $this->register_secure_route(
            '/favorite-questions/toggle',
            WP_REST_Server::CREATABLE,
            'toggle_favorite_question',
            [
                'validation_schema' => [
                    'question_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1
                    ]
                ]
            ]
        );
    }

    // ============================================================
    // MARK CONTENT COMPLETE
    // ============================================================

    /**
     * Mark content as complete
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function mark_content_complete(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $content_id = $request->get_param('content_id');
            $content_type = $request->get_param('content_type');
            $course_id = $request->get_param('course_id');
            $parent_lesson_id = $request->get_param('parent_lesson_id');
            $step_index = $request->get_param('step_index');

            // Log API call
            $this->log_api_call('/student-progress/mark-complete', [
                'user_id' => $user_id,
                'content_id' => $content_id,
                'content_type' => $content_type,
                'course_id' => $course_id,
                'parent_lesson_id' => $parent_lesson_id,
                'step_index' => $step_index
            ]);

            // Check course access
            $access_check = $this->check_course_access($course_id);
            if (is_wp_error($access_check)) {
                return $access_check;
            }

            // Para steps, usar identificador compuesto
            $unique_content_id = $content_id;
            if ($content_type === 'step' && $parent_lesson_id !== null && $step_index !== null) {
                // Crear identificador único: lesson_id * 10000 + step_index
                $unique_content_id = ($parent_lesson_id * 10000) + $step_index;
            }

            // Check if record exists
            $existing = $this->db_get_var(
                "SELECT progress_id FROM {$this->get_table('student_progress')} 
                 WHERE user_id = %d AND content_id = %d AND content_type = %s",
                [$user_id, $unique_content_id, $content_type]
            );

            if ($existing) {
                // Update existing
                $this->db_update(
                    'student_progress',
                    [
                        'status' => 'completed',
                        'last_viewed' => $this->get_mysql_timestamp()
                    ],
                    ['progress_id' => $existing],
                    ['%s', '%s'],
                    ['%d']
                );
            } else {
                // Insert new
                $this->db_insert('student_progress', [
                    'user_id' => $user_id,
                    'course_id' => $course_id,
                    'content_id' => $unique_content_id,
                    'content_type' => $content_type,
                    'status' => 'completed',
                    'last_viewed' => $this->get_mysql_timestamp()
                ], ['%d', '%d', '%d', '%s', '%s', '%s']);
            }

            // Si es un step, verificar si todos los steps de la lección están completados
            // y marcar la lección padre como completada automáticamente
            if ($content_type === 'step' && $parent_lesson_id) {
                $this->auto_complete_lesson_if_all_steps_done($user_id, $course_id, $parent_lesson_id);
            }

            // Calculate and update course progress
            $progress_percentage = $this->calculate_course_progress($user_id, $course_id);

            // Update user meta
            update_user_meta($user_id, "_course_{$course_id}_progress", $progress_percentage);
            update_user_meta($user_id, "_course_{$course_id}_last_activity", current_time('mysql'));

            $this->log_info('Content marked as complete', [
                'user_id' => $user_id,
                'content_id' => $content_id,
                'unique_content_id' => $unique_content_id,
                'content_type' => $content_type,
                'course_id' => $course_id,
                'progress' => $progress_percentage
            ]);

            return $this->success_response([
                'progress' => $progress_percentage
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in mark_content_complete', [
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

    /**
     * Unmark content (remove completion)
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function unmark_content_complete(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $content_id = $request->get_param('content_id');
            $content_type = $request->get_param('content_type');
            $course_id = $request->get_param('course_id');
            $parent_lesson_id = $request->get_param('parent_lesson_id');
            $step_index = $request->get_param('step_index');

            // Log API call
            $this->log_api_call('/student-progress/unmark-complete', [
                'user_id' => $user_id,
                'content_id' => $content_id,
                'content_type' => $content_type,
                'course_id' => $course_id,
                'parent_lesson_id' => $parent_lesson_id,
                'step_index' => $step_index
            ]);

            // Check course access
            $access_check = $this->check_course_access($course_id);
            if (is_wp_error($access_check)) {
                return $access_check;
            }

            // Para steps, usar identificador compuesto
            $unique_content_id = $content_id;
            if ($content_type === 'step' && $parent_lesson_id !== null && $step_index !== null) {
                $unique_content_id = ($parent_lesson_id * 10000) + $step_index;
            }

            // Delete the progress record
            $deleted = $this->db_delete(
                'student_progress',
                [
                    'user_id' => $user_id,
                    'content_id' => $unique_content_id,
                    'content_type' => $content_type,
                    'course_id' => $course_id
                ],
                ['%d', '%d', '%s', '%d']
            );

            // Si es un step, desmarcar la lección padre si ya no todos los steps están completados
            if ($content_type === 'step' && $parent_lesson_id) {
                $this->unmark_lesson_if_steps_incomplete($user_id, $course_id, $parent_lesson_id);
            }

            // Calculate and update course progress
            $progress_percentage = $this->calculate_course_progress($user_id, $course_id);

            // Update user meta
            update_user_meta($user_id, "_course_{$course_id}_progress", $progress_percentage);
            update_user_meta($user_id, "_course_{$course_id}_last_activity", current_time('mysql'));

            $this->log_info('Content unmarked', [
                'user_id' => $user_id,
                'content_id' => $content_id,
                'unique_content_id' => $unique_content_id,
                'content_type' => $content_type,
                'course_id' => $course_id,
                'deleted' => $deleted,
                'progress' => $progress_percentage
            ]);

            return $this->success_response([
                'progress' => $progress_percentage,
                'deleted' => (bool) $deleted
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in unmark_content_complete', [
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
    // GET COURSE PROGRESS
    // ============================================================

    /**
     * Get course progress for current user
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function get_course_progress(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $course_id = $request->get_param('course_id');

            // Log API call
            $this->log_api_call('/student-progress/course', [
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);

            // Check course access
            $access_check = $this->check_course_access($course_id);
            if (is_wp_error($access_check)) {
                return $access_check;
            }

            // Calculate progress and get detailed stats
            $stats = $this->calculate_course_progress_detailed($user_id, $course_id);
            $progress_percentage = $stats['percentage'];

            // Get last activity
            $last_activity = get_user_meta($user_id, "_course_{$course_id}_last_activity", true);

            return $this->success_response([
                'course_id' => (int) $course_id,
                'percentage' => $progress_percentage,
                'total_steps' => $stats['total_steps'],
                'completed_steps' => $stats['completed_steps'],
                'steps_by_type' => $stats['steps_by_type'],
                'last_activity' => $last_activity ?: null
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in get_course_progress', [
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
    // GET COMPLETED CONTENT
    // ============================================================

    /**
     * Get completed content for a course
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function get_completed_content(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $course_id = $request->get_param('course_id');

            // Log API call
            $this->log_api_call('/student-progress/completed', [
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);

            // Check course access
            $access_check = $this->check_course_access($course_id);
            if (is_wp_error($access_check)) {
                return $access_check;
            }

            // Get completed content from student_progress
            $completed = $this->db_get_results(
                "SELECT content_id, content_type, status, last_viewed
                 FROM {$this->get_table('student_progress')}
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'
                 ORDER BY last_viewed DESC",
                [$user_id, $course_id]
            );

            // Format results
            $formatted = array_map(function ($item) {
                return [
                    'content_id' => (int) $item->content_id,
                    'content_type' => $item->content_type,
                    'status' => $item->status,
                    'completed_at' => $item->last_viewed
                ];
            }, $completed ?: []);

            // Supplement with quiz step completions derived from quiz_attempts.
            // This covers cases where the frontend mark-complete call failed after
            // quiz submission, as well as existing historical data.
            $formatted = $this->merge_quiz_attempt_completions($user_id, $course_id, $formatted);

            return $this->success_response($formatted);

        } catch (Exception $e) {
            $this->log_error('Exception in get_completed_content', [
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
    // FAVORITE QUESTIONS
    // ============================================================

    /**
     * Toggle favorite question
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function toggle_favorite_question(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $question_id = $request->get_param('question_id');

            // Log API call
            $this->log_api_call('/favorite-questions/toggle', [
                'user_id' => $user_id,
                'question_id' => $question_id
            ]);

            // Validate question
            $question = $this->validate_post($question_id, 'qe_question');
            if (is_wp_error($question)) {
                return $question;
            }

            // Check if already favorited
            $existing = $this->db_get_var(
                "SELECT favorite_id FROM {$this->get_table('favorite_questions')} 
                 WHERE user_id = %d AND question_id = %d",
                [$user_id, $question_id]
            );

            $is_favorited = false;

            if ($existing) {
                // Remove from favorites
                $this->db_delete(
                    'favorite_questions',
                    ['favorite_id' => $existing],
                    ['%d']
                );
                $is_favorited = false;
            } else {
                // Add to favorites
                $this->db_insert('favorite_questions', [
                    'user_id' => $user_id,
                    'question_id' => $question_id,
                    'date_added' => $this->get_mysql_timestamp()
                ], ['%d', '%d', '%s']);
                $is_favorited = true;
            }

            $this->log_info('Favorite question toggled', [
                'user_id' => $user_id,
                'question_id' => $question_id,
                'is_favorited' => $is_favorited
            ]);

            return $this->success_response([
                'is_favorited' => $is_favorited
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in toggle_favorite_question', [
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
    // HELPER METHODS
    // ============================================================

    /**
     * Merge quiz-attempt-derived step completions into a student_progress result set.
     *
     * For each quiz-type step in the course's lessons, if the user has a completed
     * attempt in qe_quiz_attempts but no matching entry in $existing_completions,
     * a synthesized completion record is appended.  This makes quiz progress resilient
     * to missed mark-complete API calls from the frontend.
     *
     * @param int   $user_id              Current user ID
     * @param int   $course_id            Course ID
     * @param array $existing_completions Already-formatted student_progress rows
     * @return array Merged completion list
     */
    private function merge_quiz_attempt_completions($user_id, $course_id, $existing_completions)
    {
        try {
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
            if (empty($lesson_ids) || !is_array($lesson_ids)) {
                return $existing_completions;
            }

            // Build a set of step content_ids already marked complete so we can skip duplicates
            $already_complete = [];
            foreach ($existing_completions as $item) {
                if ($item['content_type'] === 'step') {
                    $already_complete[$item['content_id']] = true;
                }
            }

            // Fetch all quiz IDs this user has completed for this course in one query
            $completed_attempts = $this->db_get_results(
                "SELECT DISTINCT quiz_id
                 FROM {$this->get_table('quiz_attempts')}
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'",
                [$user_id, $course_id]
            );

            if (empty($completed_attempts)) {
                return $existing_completions;
            }

            $completed_quiz_ids = [];
            foreach ($completed_attempts as $row) {
                $completed_quiz_ids[(int) $row->quiz_id] = true;
            }

            $synthesized = [];
            $today = gmdate('Y-m-d');

            foreach ($lesson_ids as $lesson_id) {
                // Respect lesson visibility rules
                $lesson_start = get_post_meta($lesson_id, '_start_date', true);
                if ($lesson_start === '9999-12-31') {
                    continue;
                }
                if (!empty($lesson_start) && $lesson_start > $today) {
                    continue;
                }

                $steps = get_post_meta($lesson_id, '_lesson_steps', true);
                if (!is_array($steps)) {
                    continue;
                }

                $steps = array_values($steps);

                foreach ($steps as $index => $step) {
                    if (
                        !isset($step['type']) || $step['type'] !== 'quiz' ||
                        !isset($step['data']['quiz_id'])
                    ) {
                        continue;
                    }

                    $quiz_id = (int) $step['data']['quiz_id'];

                    if (!isset($completed_quiz_ids[$quiz_id])) {
                        continue;
                    }

                    $unique_step_id = (intval($lesson_id) * 10000) + intval($index);

                    if (isset($already_complete[$unique_step_id])) {
                        continue; // Already recorded in student_progress
                    }

                    $synthesized[] = [
                        'content_id'   => $unique_step_id,
                        'content_type' => 'step',
                        'status'       => 'completed',
                        'completed_at' => null
                    ];

                    // Mark as seen so we don't duplicate within the same pass
                    $already_complete[$unique_step_id] = true;
                }
            }

            return array_merge($existing_completions, $synthesized);

        } catch (Exception $e) {
            $this->log_error('Exception in merge_quiz_attempt_completions', [
                'message'   => $e->getMessage(),
                'user_id'   => $user_id,
                'course_id' => $course_id,
            ]);

            return $existing_completions; // Fail gracefully
        }
    }

    /**
     * Auto-complete lesson if all its steps are completed
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @param int $lesson_id Lesson ID
     * @return void
     */
    private function auto_complete_lesson_if_all_steps_done($user_id, $course_id, $lesson_id)
    {
        try {
            // Get lesson steps
            $steps = get_post_meta($lesson_id, '_lesson_steps', true);

            if (empty($steps) || !is_array($steps)) {
                return;
            }

            // Re-index array to ensure numeric keys starting from 0
            $steps = array_values($steps);
            $total_steps = count($steps);
            $completed_steps = 0;

            // Check each step
            foreach ($steps as $index => $step) {
                $unique_step_id = (intval($lesson_id) * 10000) + intval($index);

                $is_completed = $this->db_get_var(
                    "SELECT progress_id FROM {$this->get_table('student_progress')} 
                     WHERE user_id = %d AND content_id = %d AND content_type = 'step' AND status = 'completed'",
                    [$user_id, $unique_step_id]
                );

                if ($is_completed) {
                    $completed_steps++;
                }
            }

            // Si todos los steps están completados, marcar la lección como completada
            if ($completed_steps === $total_steps) {
                $this->log_info('All steps completed, auto-completing lesson', [
                    'lesson_id' => $lesson_id,
                    'total_steps' => $total_steps
                ]);

                // Check if lesson already marked as complete
                $existing = $this->db_get_var(
                    "SELECT progress_id FROM {$this->get_table('student_progress')} 
                     WHERE user_id = %d AND content_id = %d AND content_type = 'lesson'",
                    [$user_id, $lesson_id]
                );

                if ($existing) {
                    // Update existing
                    $this->db_update(
                        'student_progress',
                        [
                            'status' => 'completed',
                            'last_viewed' => $this->get_mysql_timestamp()
                        ],
                        ['progress_id' => $existing],
                        ['%s', '%s'],
                        ['%d']
                    );
                } else {
                    // Insert new
                    $this->db_insert('student_progress', [
                        'user_id' => $user_id,
                        'course_id' => $course_id,
                        'content_id' => $lesson_id,
                        'content_type' => 'lesson',
                        'status' => 'completed',
                        'last_viewed' => $this->get_mysql_timestamp()
                    ], ['%d', '%d', '%d', '%s', '%s', '%s']);
                }
            }

        } catch (Exception $e) {
            $this->log_error('Exception in auto_complete_lesson_if_all_steps_done', [
                'message' => $e->getMessage(),
                'lesson_id' => $lesson_id
            ]);
        }
    }

    /**
     * Unmark lesson if not all steps are completed
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @param int $lesson_id Lesson ID
     * @return void
     */
    private function unmark_lesson_if_steps_incomplete($user_id, $course_id, $lesson_id)
    {
        try {
            // Get lesson steps
            $steps = get_post_meta($lesson_id, '_lesson_steps', true);

            if (empty($steps) || !is_array($steps)) {
                return;
            }

            // Re-index array to ensure numeric keys starting from 0
            $steps = array_values($steps);
            $total_steps = count($steps);
            $completed_steps = 0;

            // Check each step
            foreach ($steps as $index => $step) {
                $unique_step_id = (intval($lesson_id) * 10000) + intval($index);

                $is_completed = $this->db_get_var(
                    "SELECT progress_id FROM {$this->get_table('student_progress')} 
                     WHERE user_id = %d AND content_id = %d AND content_type = 'step' AND status = 'completed'",
                    [$user_id, $unique_step_id]
                );

                if ($is_completed) {
                    $completed_steps++;
                }
            }

            // Si NO todos los steps están completados, desmarcar la lección
            if ($completed_steps < $total_steps) {
                $this->log_info('Steps incomplete, unmarking lesson', [
                    'lesson_id' => $lesson_id,
                    'completed_steps' => $completed_steps,
                    'total_steps' => $total_steps
                ]);

                // Delete lesson completion record
                $this->db_delete(
                    'student_progress',
                    [
                        'user_id' => $user_id,
                        'content_id' => $lesson_id,
                        'content_type' => 'lesson',
                        'course_id' => $course_id
                    ],
                    ['%d', '%d', '%s', '%d']
                );
            }

        } catch (Exception $e) {
            $this->log_error('Exception in unmark_lesson_if_steps_incomplete', [
                'message' => $e->getMessage(),
                'lesson_id' => $lesson_id
            ]);
        }
    }

    /**
     * Calculate course progress percentage with detailed stats
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return array Progress stats with breakdown by type
     */
    private function calculate_course_progress_detailed($user_id, $course_id)
    {
        try {
            // Get lesson IDs from course meta
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

            $stats = [
                'total_steps' => 0,
                'completed_steps' => 0,
                'percentage' => 0,
                'steps_by_type' => [
                    'quiz' => ['total' => 0, 'completed' => 0],
                    'video' => ['total' => 0, 'completed' => 0],
                    'text' => ['total' => 0, 'completed' => 0],
                    'image' => ['total' => 0, 'completed' => 0]
                ]
            ];

            if (empty($lesson_ids) || !is_array($lesson_ids)) {
                return $stats;
            }

            // Count total steps by type across all lessons
            $today = gmdate('Y-m-d');
            foreach ($lesson_ids as $lesson_id) {
                // Skip entire lesson if hidden (sentinel date) or not yet unlocked
                $lesson_start_date = get_post_meta($lesson_id, '_start_date', true);
                if ($lesson_start_date === '9999-12-31') {
                    continue;
                }
                if (!empty($lesson_start_date) && $lesson_start_date > $today) {
                    continue;
                }

                $steps = get_post_meta($lesson_id, '_lesson_steps', true);
                if (is_array($steps)) {
                    // Re-index array to ensure numeric keys starting from 0
                    $steps = array_values($steps);
                    foreach ($steps as $index => $step) {
                        // Skip steps that are hidden (sentinel date) or not yet unlocked
                        $step_start_date = isset($step['start_date']) ? $step['start_date'] : '';
                        if ($step_start_date === '9999-12-31') {
                            continue;
                        }
                        if (!empty($step_start_date) && $step_start_date > $today) {
                            continue;
                        }

                        $step_type = isset($step['type']) ? $step['type'] : 'text';

                        // Ensure step type exists in stats
                        if (!isset($stats['steps_by_type'][$step_type])) {
                            $stats['steps_by_type'][$step_type] = ['total' => 0, 'completed' => 0];
                        }

                        $stats['steps_by_type'][$step_type]['total']++;
                        $stats['total_steps']++;

                        // Check if this step is completed
                        $unique_step_id = (intval($lesson_id) * 10000) + intval($index);
                        $is_completed = $this->db_get_var(
                            "SELECT progress_id FROM {$this->get_table('student_progress')} 
                             WHERE user_id = %d AND content_id = %d AND content_type = 'step' AND status = 'completed'",
                            [$user_id, $unique_step_id]
                        );

                        if ($is_completed) {
                            $stats['steps_by_type'][$step_type]['completed']++;
                            $stats['completed_steps']++;
                        }
                    }
                }
            }

            // Calculate percentage
            if ($stats['total_steps'] > 0) {
                $stats['percentage'] = round(($stats['completed_steps'] / $stats['total_steps']) * 100, 2);
            }

            return $stats;

        } catch (Exception $e) {
            $this->log_error('Exception in calculate_course_progress_detailed', [
                'message' => $e->getMessage(),
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);

            return [
                'total_steps' => 0,
                'completed_steps' => 0,
                'percentage' => 0,
                'steps_by_type' => []
            ];
        }
    }

    /**
     * Calculate course progress percentage
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return float Progress percentage
     */
    private function calculate_course_progress($user_id, $course_id)
    {
        try {
            // Get lesson IDs from course meta
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

            if (empty($lesson_ids) || !is_array($lesson_ids)) {
                return 0;
            }

            // Count total steps across all lessons
            $total_steps = 0;
            foreach ($lesson_ids as $lesson_id) {
                $steps = get_post_meta($lesson_id, '_lesson_steps', true);
                if (is_array($steps)) {
                    $total_steps += count($steps);
                }
            }

            if ($total_steps === 0) {
                return 0;
            }

            // Count completed steps
            $completed_steps = $this->db_get_var(
                "SELECT COUNT(*) FROM {$this->get_table('student_progress')} 
                 WHERE user_id = %d AND course_id = %d AND content_type = 'step' AND status = 'completed'",
                [$user_id, $course_id]
            );

            return round(($completed_steps / $total_steps) * 100, 2);

        } catch (Exception $e) {
            $this->log_error('Exception in calculate_course_progress', [
                'message' => $e->getMessage(),
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);

            return 0;
        }
    }
}

// Initialize
new QE_Student_Progress_API();