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

            // Calculate progress
            $progress_percentage = $this->calculate_course_progress($user_id, $course_id);

            // Get last activity
            $last_activity = get_user_meta($user_id, "_course_{$course_id}_last_activity", true);

            return $this->success_response([
                'course_id' => (int) $course_id,
                'percentage' => $progress_percentage,
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

            // Get completed content
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
            $question = $this->validate_post($question_id, 'question');
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

            $total_steps = count($steps);
            $completed_steps = 0;

            // Check each step
            foreach ($steps as $index => $step) {
                $unique_step_id = ($lesson_id * 10000) + $index;

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

            $total_steps = count($steps);
            $completed_steps = 0;

            // Check each step
            foreach ($steps as $index => $step) {
                $unique_step_id = ($lesson_id * 10000) + $index;

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
     * Calculate course progress percentage
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return float Progress percentage
     */
    private function calculate_course_progress($user_id, $course_id)
    {
        try {
            // Get total lessons
            $total_lessons = count(get_posts([
                'post_type' => 'lesson',
                'meta_key' => '_course_id',
                'meta_value' => $course_id,
                'posts_per_page' => -1,
                'fields' => 'ids'
            ]));

            // Get total quizzes
            $total_quizzes = count(get_posts([
                'post_type' => 'quiz',
                'meta_key' => '_course_id',
                'meta_value' => $course_id,
                'posts_per_page' => -1,
                'fields' => 'ids'
            ]));

            $total_items = $total_lessons + $total_quizzes;

            if ($total_items === 0) {
                return 0;
            }

            // Get completed items
            $completed_count = $this->db_get_var(
                "SELECT COUNT(*) FROM {$this->get_table('student_progress')} 
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'",
                [$user_id, $course_id]
            );

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
}

// Initialize
new QE_Student_Progress_API();