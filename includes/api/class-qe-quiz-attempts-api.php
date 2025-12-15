<?php
/**
 * QE_Quiz_Attempts_API Class
 *
 * Handles quiz attempt endpoints: starting and submitting quiz attempts.
 * Includes full validation, scoring, and ranking updates.
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

class QE_Quiz_Attempts_API extends QE_API_Base
{
    /**
     * Register routes
     */
    public function register_routes()
    {
        // Start quiz attempt
        $this->register_secure_route(
            '/quiz-attempts/start',
            WP_REST_Server::CREATABLE,
            'start_quiz_attempt',
            [
                'validation_schema' => [
                    'quiz_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => 'Quiz ID to start'
                    ],
                    'lesson_id' => [
                        'required' => false,
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => 'Lesson ID where the quiz is taken'
                    ]
                ]
            ]
        );

        // Submit quiz attempt
        $this->register_secure_route(
            '/quiz-attempts/submit',
            WP_REST_Server::CREATABLE,
            'submit_quiz_attempt',
            [
                'permission_callback' => [$this, 'check_submit_permission'],
                'validation_schema' => [
                    'attempt_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => 'Attempt ID to submit'
                    ],
                    'answers' => [
                        'required' => true,
                        'type' => 'array',
                        'description' => 'Array of answers',
                        'items' => [
                            'type' => 'object'
                        ]
                    ]
                ]
            ]
        );

        $this->register_secure_route(
            '/quiz-generator/calculate-results',
            WP_REST_Server::CREATABLE,
            'calculate_generated_quiz',
            [
                'validation_schema' => [
                    'answers' => [
                        'required' => true,
                        'type' => 'array',
                        'description' => 'Array of answers from the user.',
                        'items' => ['type' => 'object']
                    ],
                    'question_ids' => [
                        'required' => true,
                        'type' => 'array',
                        'description' => 'Array of question IDs included in the quiz.',
                        'items' => ['type' => 'integer']
                    ]
                ]
            ]
        );

        $this->register_secure_route(
            '/my-quiz-attempts',
            WP_REST_Server::READABLE, // Método GET
            'get_my_quiz_attempts',
            [
                'validation_schema' => [
                    'per_page' => [
                        'type' => 'integer',
                        'default' => 10,
                        'minimum' => 1,
                        'maximum' => 100,
                    ],
                    'page' => [
                        'type' => 'integer',
                        'default' => 1,
                        'minimum' => 1,
                    ],
                ]
            ]
        );

        $this->register_secure_route(
            '/quiz-attempts/(?P<id>\d+)',
            WP_REST_Server::READABLE,
            'get_quiz_attempt_details',
            [
                'permission_callback' => [$this, 'check_get_details_permission']
            ]
        );

        $this->register_secure_route(
            '/quiz-attempts/(?P<id>\d+)',
            WP_REST_Server::READABLE,
            'get_quiz_attempt_details',
            [
                'permission_callback' => [$this, 'check_get_details_permission']
            ]
        );

        // 🔧 TEMPORAL: Endpoint para sincronizar course_ids en quizzes
        register_rest_route($this->namespace, '/sync-quiz-course-ids', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'sync_quiz_course_ids'],
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        ]);
    }

    // ============================================================
    // 🔥 NUEVO: OBTENER DETALLES DE UN INTENTO
    // ============================================================

    /**
     * Devuelve los detalles completos de un intento de cuestionario.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_quiz_attempt_details(WP_REST_Request $request)
    {
        $attempt_id = (int) $request['id'];

        global $wpdb;
        $attempts_table = $this->get_table('quiz_attempts');
        $answers_table = $this->get_table('attempt_answers');

        // 1. Obtener la información principal del intento y el título del cuestionario.
        $attempt = $wpdb->get_row($wpdb->prepare(
            "SELECT att.*, att.time_taken_seconds as duration_seconds, quiz.post_title as quizTitle 
         FROM {$attempts_table} AS att
         LEFT JOIN {$wpdb->posts} AS quiz ON att.quiz_id = quiz.ID
         WHERE att.attempt_id = %d",
            $attempt_id
        ));

        if (!$attempt) {
            return $this->error_response('not_found', 'Intento no encontrado.', 404);
        }

        // 2. Obtener las respuestas dadas por el usuario en este intento.
        $user_answers = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$answers_table} WHERE attempt_id = %d",
            $attempt_id
        ));

        // 3. Obtener los IDs de todas las preguntas involucradas.
        $question_ids_from_answers = array_map(function ($answer) {
            return (int) $answer->question_id;
        }, $user_answers);

        // Obtener TODOS los IDs de las preguntas del quiz original para incluir las no contestadas.
        $all_question_ids_in_quiz = get_post_meta($attempt->quiz_id, '_quiz_question_ids', true);
        if (!is_array($all_question_ids_in_quiz))
            $all_question_ids_in_quiz = [];

        $all_question_ids = array_unique(array_merge($question_ids_from_answers, $all_question_ids_in_quiz));

        // Get user favorites
        $user_id = get_current_user_id();
        $fav_table = $wpdb->prefix . 'qe_favorite_questions';
        $favorites = $wpdb->get_col($wpdb->prepare(
            "SELECT question_id FROM {$fav_table} WHERE user_id = %d",
            $user_id
        ));

        $questions_data = [];
        if (!empty($all_question_ids)) {
            $posts = get_posts([
                'post__in' => $all_question_ids,
                'post_type' => 'qe_question',
                'posts_per_page' => -1,
                'orderby' => 'post__in',
            ]);

            foreach ($posts as $post) {
                $questions_data[$post->ID] = [
                    'id' => $post->ID,
                    'title' => get_the_title($post->ID),
                    'content' => $post->post_content, // Include content (explanation)
                    'is_favorite' => in_array($post->ID, $favorites),
                    'meta' => [ // Replicamos la estructura que el frontend espera
                        '_question_options' => get_post_meta($post->ID, '_question_options', true),
                        '_explanation' => get_post_meta($post->ID, '_explanation', true), // Include explanation meta
                        '_question_type' => get_post_meta($post->ID, '_question_type', true), // Include type
                    ],
                ];
            }
        }

        // 4. Calcular estadísticas de error por pregunta para todo el quiz
        // Solo cuenta el último intento de cada usuario para este quiz
        $question_stats = [];
        if (!empty($all_question_ids)) {
            $quiz_id = $attempt->quiz_id;

            foreach ($all_question_ids as $question_id) {
                // Subconsulta para obtener solo el último intento de cada usuario para este quiz
                // Contamos total de usuarios únicos que han respondido esta pregunta (último intento)
                $total_answers = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$answers_table} ans
                     INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                     WHERE ans.question_id = %d 
                     AND att.quiz_id = %d
                     AND ans.answer_given IS NOT NULL
                     AND att.attempt_id = (
                         SELECT MAX(att2.attempt_id) 
                         FROM {$attempts_table} att2 
                         WHERE att2.user_id = att.user_id 
                         AND att2.quiz_id = %d
                         AND att2.status = 'completed'
                     )",
                    $question_id,
                    $quiz_id,
                    $quiz_id
                ));

                // Contamos usuarios únicos que han fallado esta pregunta (último intento)
                $incorrect_answers = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$answers_table} ans
                     INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                     WHERE ans.question_id = %d 
                     AND att.quiz_id = %d
                     AND ans.is_correct = 0 
                     AND ans.answer_given IS NOT NULL
                     AND att.attempt_id = (
                         SELECT MAX(att2.attempt_id) 
                         FROM {$attempts_table} att2 
                         WHERE att2.user_id = att.user_id 
                         AND att2.quiz_id = %d
                         AND att2.status = 'completed'
                     )",
                    $question_id,
                    $quiz_id,
                    $quiz_id
                ));

                $error_percentage = 0;
                if ($total_answers > 0) {
                    $error_percentage = round(($incorrect_answers / $total_answers) * 100, 1);
                }

                $question_stats[$question_id] = [
                    'total_answers' => (int) $total_answers,
                    'incorrect_answers' => (int) $incorrect_answers,
                    'error_percentage' => $error_percentage
                ];
            }
        }

        // 5. Unir toda la información para el `detailed_results`.
        $detailed_results = [];
        foreach ($all_question_ids as $question_id) {
            $question_details = $questions_data[$question_id] ?? null;
            if (!$question_details)
                continue;

            // Buscar la respuesta del usuario para esta pregunta
            $user_answer_obj = array_values(array_filter($user_answers, function ($ua) use ($question_id) {
                return (int) $ua->question_id === (int) $question_id;
            }));
            $user_answer = $user_answer_obj[0] ?? null;

            // Encontrar la respuesta correcta en las opciones.
            $correct_answer_id = null;
            $options = $question_details['meta']['_question_options'];
            if (is_array($options)) {
                foreach ($options as $option) {
                    if (!empty($option['isCorrect'])) {
                        $correct_answer_id = $option['id'];
                        break;
                    }
                }
            }

            $detailed_results[] = [
                'question_id' => (int) $question_id,
                'answer_given' => $user_answer ? $user_answer->answer_given : null,
                'correct_answer' => $correct_answer_id, // Cambiado para consistencia
                'is_correct' => $user_answer ? (bool) $user_answer->is_correct : false,
                'is_risked' => $user_answer ? (bool) $user_answer->is_risked : false,
                'error_percentage' => $question_stats[$question_id]['error_percentage'] ?? 0,
                'total_answers' => $question_stats[$question_id]['total_answers'] ?? 0,
            ];
        }

        // 5. Construir la respuesta final de la API.
        $response_data = [
            'attempt' => $attempt,
            'questions' => array_values($questions_data), // Devolvemos un array de preguntas
            'detailed_results' => $detailed_results
        ];

        return $this->success_response($response_data);
    }

    /**
     * Get quiz attempts for the current logged-in user.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_my_quiz_attempts(WP_REST_Request $request)
    {
        $user_id = get_current_user_id();
        if (empty($user_id)) {
            return $this->error_response('not_logged_in', __('You must be logged in to view your attempts.', 'quiz-extended'), 401);
        }

        $page = $request->get_param('page');
        $per_page = $request->get_param('per_page');
        $offset = ($page - 1) * $per_page;

        // Obtener filtros
        $course_id = $request->get_param('course_id');
        $search = $request->get_param('search');
        $lesson_id = $request->get_param('lesson_id');
        $date_from = $request->get_param('date_from');
        $date_to = $request->get_param('date_to');

        global $wpdb;
        $attempts_table = $this->get_table('quiz_attempts');

        // Construir condiciones WHERE
        $where_conditions = ["att.user_id = %d", "att.status = 'completed'"];
        $where_params = [$user_id];

        // Filtro por curso - buscar en att.course_id o en el array _course_ids del quiz
        if (!empty($course_id)) {
            // Comprobar si el att.course_id coincide (legacy) O si el quiz tiene este curso en _course_ids
            // Buscamos el número en el valor serializado de forma simple
            $where_conditions[] = "((att.course_id = %d AND att.course_id != 0) OR quiz_course_ids_meta.meta_value LIKE %s OR quiz_course_id_meta.meta_value = %d)";
            $where_params[] = $course_id;
            // Buscar el ID como número en cualquier formato: %:840% encontrará i:840 o "840"
            $where_params[] = '%:' . $course_id . '%';
            $where_params[] = $course_id;
        }

        // Filtro por lección
        if (!empty($lesson_id)) {
            $where_conditions[] = "(att.lesson_id = %d OR (att.lesson_id IS NULL AND lesson_meta.meta_value = %d))";
            $where_params[] = $lesson_id;
            $where_params[] = $lesson_id;
        }

        // Filtro por búsqueda de texto
        if (!empty($search)) {
            $where_conditions[] = "quiz.post_title LIKE %s";
            $where_params[] = '%' . $wpdb->esc_like($search) . '%';
        }

        // Filtro por rango de fechas
        if (!empty($date_from)) {
            $where_conditions[] = "DATE(att.end_time) >= %s";
            $where_params[] = $date_from;
        }
        if (!empty($date_to)) {
            $where_conditions[] = "DATE(att.end_time) <= %s";
            $where_params[] = $date_to;
        }

        $where_clause = implode(' AND ', $where_conditions);

        // Query para obtener el total de intentos
        $count_query = "SELECT COUNT(*) 
            FROM {$attempts_table} AS att
            LEFT JOIN {$wpdb->posts} AS quiz ON att.quiz_id = quiz.ID
            LEFT JOIN {$wpdb->postmeta} AS quiz_course_ids_meta ON (att.quiz_id = quiz_course_ids_meta.post_id AND quiz_course_ids_meta.meta_key = '_course_ids')
            LEFT JOIN {$wpdb->postmeta} AS quiz_course_id_meta ON (att.quiz_id = quiz_course_id_meta.post_id AND quiz_course_id_meta.meta_key = '_course_id')
            LEFT JOIN {$wpdb->postmeta} AS lesson_meta ON (att.quiz_id = lesson_meta.post_id AND lesson_meta.meta_key = '_lesson_id')
            WHERE {$where_clause}";

        $total_items = $wpdb->get_var($wpdb->prepare($count_query, $where_params));

        // Query para obtener los intentos con los títulos del quiz, curso y lección
        $query_params = array_merge($where_params, [$per_page, $offset]);
        $query = "SELECT 
                att.*, 
                att.time_taken_seconds AS duration_seconds,
                quiz.post_title AS quizTitle,
                course.post_title AS courseTitle,
                lesson.post_title AS lessonTitle,
                (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = att.quiz_id AND meta_key = '_passing_score') as passing_score,
                (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = att.quiz_id AND meta_key = '_course_id') as quiz_course_id,
                (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = att.quiz_id AND meta_key = '_lesson_id') as quiz_lesson_id
             FROM {$attempts_table} AS att
             LEFT JOIN {$wpdb->posts} AS quiz ON att.quiz_id = quiz.ID
             LEFT JOIN {$wpdb->posts} AS course ON att.course_id = course.ID
             LEFT JOIN {$wpdb->postmeta} AS quiz_course_ids_meta ON (att.quiz_id = quiz_course_ids_meta.post_id AND quiz_course_ids_meta.meta_key = '_course_ids')
             LEFT JOIN {$wpdb->postmeta} AS quiz_course_id_meta ON (att.quiz_id = quiz_course_id_meta.post_id AND quiz_course_id_meta.meta_key = '_course_id')
             LEFT JOIN {$wpdb->postmeta} AS lesson_meta ON (att.quiz_id = lesson_meta.post_id AND lesson_meta.meta_key = '_lesson_id')
             LEFT JOIN {$wpdb->posts} AS lesson ON (COALESCE(att.lesson_id, lesson_meta.meta_value) = lesson.ID)
             WHERE {$where_clause}
             ORDER BY att.end_time DESC
             LIMIT %d OFFSET %d";

        $results = $wpdb->get_results($wpdb->prepare($query, $query_params));

        // Procesar resultados
        foreach ($results as $result) {
            // Corregir course_id si es 0
            if (empty($result->course_id) || $result->course_id == 0) {
                if (!empty($result->quiz_course_id)) {
                    $result->course_id = $result->quiz_course_id;
                    if (empty($result->courseTitle)) {
                        $course_post = get_post($result->quiz_course_id);
                        if ($course_post) {
                            $result->courseTitle = $course_post->post_title;
                        }
                    }
                }
            }

            // Asegurar que lessonTitle existe
            if (empty($result->lessonTitle) && !empty($result->quiz_lesson_id)) {
                $lesson_post = get_post($result->quiz_lesson_id);
                if ($lesson_post) {
                    $result->lessonTitle = $lesson_post->post_title;
                }
            }

            // Calcular si pasó o no
            $passing_score_raw = isset($result->passing_score) ? floatval($result->passing_score) : 7.0;
            $passing_score = $passing_score_raw > 10 ? ($passing_score_raw / 10) : $passing_score_raw;
            $result->passed = (float) $result->score >= $passing_score;

            // Limpiar campos temporales
            unset($result->quiz_course_id);
            unset($result->quiz_lesson_id);
        }

        $response = new WP_REST_Response($results, 200);

        // Añadir cabeceras de paginación
        $total_pages = ceil($total_items / $per_page);
        $response->header('X-WP-Total', $total_items);
        $response->header('X-WP-TotalPages', $total_pages);

        return $response;
    }


    // ============================================================
    // START QUIZ ATTEMPT
    // ============================================================

    /**
     * Start a new quiz attempt
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function start_quiz_attempt(WP_REST_Request $request)
    {
        try {
            $quiz_id = $request->get_param('quiz_id');
            $lesson_id = $request->get_param('lesson_id');
            $user_id = get_current_user_id();

            // Log API call
            $this->log_api_call('/quiz-attempts/start', [
                'quiz_id' => $quiz_id,
                'lesson_id' => $lesson_id,
                'user_id' => $user_id
            ]);

            // Validate quiz
            $quiz = $this->validate_post($quiz_id, 'qe_quiz');
            if (is_wp_error($quiz)) {
                return $quiz;
            }

            // Check if quiz is published
            if ($quiz->post_status !== 'publish') {
                return $this->error_response(
                    'quiz_not_available',
                    __('This quiz is not currently available.', 'quiz-extended'),
                    403
                );
            }

            // Check if user can take this quiz
            if (!$this->auth->can_take_quiz($quiz_id)) {
                return $this->error_response(
                    'quiz_access_denied',
                    __('You do not have permission to take this quiz.', 'quiz-extended'),
                    403
                );
            }

            // Get course ID - primero intentar desde _course_ids (nuevo), luego _course_id (legacy)
            $course_ids = get_post_meta($quiz_id, '_course_ids', true);

            // 🔧 DEBUG TEMPORAL
            error_log("START_QUIZ_ATTEMPT - Quiz ID: $quiz_id");
            error_log("_course_ids raw: " . print_r($course_ids, true));

            // Si _course_ids está vacío, intentar sincronizar automáticamente
            if (!is_array($course_ids) || empty($course_ids)) {
                error_log("_course_ids is empty, attempting auto-sync for quiz $quiz_id");

                // Intentar sincronizar desde las lecciones
                if (class_exists('QE_Quiz_Course_Sync')) {
                    $sync_instance = new QE_Quiz_Course_Sync();
                    // Usar reflexión para llamar al método privado
                    $reflection = new ReflectionClass($sync_instance);
                    $method = $reflection->getMethod('rebuild_quiz_course_ids');
                    $method->setAccessible(true);
                    $method->invoke($sync_instance, $quiz_id);

                    // Volver a obtener después de la sincronización
                    $course_ids = get_post_meta($quiz_id, '_course_ids', true);
                    error_log("After auto-sync, _course_ids: " . print_r($course_ids, true));
                }
            }

            if (is_array($course_ids) && !empty($course_ids)) {
                // Usar el primer course_id del array
                $course_id = absint($course_ids[0]);
            } else {
                // Fallback a _course_id legacy
                $course_id = get_post_meta($quiz_id, '_course_id', true);
                $course_id = absint($course_id);
                error_log("Using legacy _course_id: $course_id");
            }

            error_log("Final course_id used: $course_id");
            // 🔧 FIN DEBUG            // Check max attempts
            $max_attempts_check = $this->check_max_attempts($user_id, $quiz_id);
            if (is_wp_error($max_attempts_check)) {
                return $max_attempts_check;
            }

            // Create attempt record
            $attempt_id = $this->create_attempt_record($user_id, $quiz_id, $course_id, $lesson_id);
            if (!$attempt_id) {
                return $this->error_response(
                    'db_error',
                    __('Could not create quiz attempt. Please try again.', 'quiz-extended'),
                    500
                );
            }

            // Get questions for this attempt
            $questions = $this->prepare_quiz_questions($quiz_id);
            if (is_wp_error($questions)) {
                return $questions;
            }

            // Get quiz settings
            $quiz_settings = $this->get_quiz_settings($quiz_id);

            // Fire action hook
            do_action('qe_quiz_attempt_started', $user_id, $quiz_id, $attempt_id);

            // Log success
            $this->log_info('Quiz attempt started successfully', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'quiz_id' => $quiz_id,
                'question_count' => count($questions)
            ]);

            return $this->success_response([
                'attempt_id' => $attempt_id,
                'quiz' => [
                    'id' => $quiz_id,
                    'title' => html_entity_decode($quiz->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'instructions' => $quiz_settings['instructions'],
                    'time_limit' => $quiz_settings['time_limit'],
                    'randomize_questions' => $quiz_settings['randomize'],
                ],
                'questions' => $questions
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in start_quiz_attempt', [
                'message' => $e->getMessage(),
            ]);

            return $this->error_response(
                'internal_error',
                __('An unexpected error occurred. Please try again.', 'quiz-extended'),
                500
            );
        }
    }

    // ============================================================
    // SUBMIT QUIZ ATTEMPT
    // ============================================================

    /**
     * Submit quiz attempt and calculate score
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response
     */
    public function submit_quiz_attempt(WP_REST_Request $request)
    {
        try {
            $attempt_id = $request->get_param('attempt_id');
            $answers = $request->get_param('answers');
            $user_id = get_current_user_id();

            // Log API call
            $this->log_api_call('/quiz-attempts/submit', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'answer_count' => count($answers)
            ]);

            // Get attempt
            $attempt = $this->get_attempt($attempt_id);
            if (is_wp_error($attempt)) {
                return $attempt;
            }

            // Check if already completed
            if ($attempt->status === 'completed') {
                return $this->error_response(
                    'already_submitted',
                    __('This quiz attempt has already been submitted.', 'quiz-extended'),
                    400
                );
            }

            $this->get_db()->query('START TRANSACTION');

            // Grade the attempt
            try {
                // Grade the attempt
                $grading_result = $this->grade_attempt($attempt, $answers);
                if (is_wp_error($grading_result)) {
                    // AÑADIDO: Revertir si hay error
                    $this->get_db()->query('ROLLBACK');
                    return $grading_result;
                }

                // Update attempt record
                $update_result = $this->complete_attempt($attempt_id, $grading_result, $attempt);
                if (!$update_result) {
                    $this->get_db()->query('ROLLBACK');
                    return $this->error_response(
                        'db_error',
                        __('Could not update quiz attempt. Please try again.', 'quiz-extended'),
                        500
                    );
                }

                $this->get_db()->query('COMMIT');

                // 🔥 FIX: Limpiar autosave después de completar exitosamente el quiz
                // Esto evita el edge case donde el frontend falla al limpiar el autosave
                $this->clear_quiz_autosave($user_id, $attempt->quiz_id);

            } catch (Exception $e) {
                $this->get_db()->query('ROLLBACK');
                $this->log_error('Exception during attempt submission transaction', [
                    'message' => $e->getMessage(),
                    'attempt_id' => $attempt_id,
                ]);
                return $this->error_response(
                    'internal_error',
                    __('An unexpected error occurred while saving the attempt.', 'quiz-extended'),
                    500
                );
            }

            // 🔥 CORRECCIÓN: Usar 'mysql', true para obtener el tiempo en UTC y asegurar un cálculo correcto.
            $start_time = new DateTime($attempt->start_time, new DateTimeZone('UTC'));
            $end_time = new DateTime(current_time('mysql', true), new DateTimeZone('UTC'));
            $duration_seconds = $end_time->getTimestamp() - $start_time->getTimestamp();


            // Update rankings
            $this->update_rankings($attempt->user_id, $attempt->course_id, $grading_result);

            // Calculate average scores for this quiz (only latest attempt per user)
            $quiz_attempts = $this->db_get_results(
                "SELECT qa.score, qa.score_with_risk 
                 FROM {$this->get_table('quiz_attempts')} qa
                 INNER JOIN (
                     SELECT user_id, MAX(attempt_id) as latest_attempt_id
                     FROM {$this->get_table('quiz_attempts')}
                     WHERE quiz_id = %d AND status = 'completed'
                     GROUP BY user_id
                 ) latest ON qa.attempt_id = latest.latest_attempt_id
                 WHERE qa.quiz_id = %d AND qa.status = 'completed'",
                [$attempt->quiz_id, $attempt->quiz_id]
            );

            $average_score = null;
            $average_score_with_risk = null;

            if (!empty($quiz_attempts)) {
                $total_score = 0;
                $total_score_with_risk = 0;
                $count = count($quiz_attempts);

                foreach ($quiz_attempts as $qa) {
                    $total_score += floatval($qa->score);
                    $total_score_with_risk += floatval($qa->score_with_risk);
                }

                $average_score = $total_score / $count;
                $average_score_with_risk = $total_score_with_risk / $count;
            }

            // Calculate question statistics - count only unique users (latest attempt per user)
            $answers_table = $this->get_table('attempt_answers');
            $attempts_table = $this->get_table('quiz_attempts');
            $question_ids = array_column($grading_result['detailed_results'], 'question_id');
            $detailed_results_with_stats = [];

            foreach ($grading_result['detailed_results'] as $detail) {
                $question_id = $detail['question_id'];

                // Count unique users who answered this question (using latest attempt per user)
                $total_answers = $this->db_get_var(
                    "SELECT COUNT(*) FROM (
                        SELECT att.user_id
                        FROM {$answers_table} ans
                        INNER JOIN (
                            SELECT user_id, MAX(attempt_id) as latest_attempt_id
                            FROM {$attempts_table}
                            WHERE quiz_id = %d AND status = 'completed'
                            GROUP BY user_id
                        ) latest ON ans.attempt_id = latest.latest_attempt_id
                        INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                        WHERE ans.question_id = %d 
                        AND ans.answer_given IS NOT NULL
                        GROUP BY att.user_id
                    ) AS unique_users",
                    [$attempt->quiz_id, $question_id]
                );

                // Count unique users who answered incorrectly (using latest attempt per user)
                $incorrect_answers = $this->db_get_var(
                    "SELECT COUNT(*) FROM (
                        SELECT att.user_id
                        FROM {$answers_table} ans
                        INNER JOIN (
                            SELECT user_id, MAX(attempt_id) as latest_attempt_id
                            FROM {$attempts_table}
                            WHERE quiz_id = %d AND status = 'completed'
                            GROUP BY user_id
                        ) latest ON ans.attempt_id = latest.latest_attempt_id
                        INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                        WHERE ans.question_id = %d 
                        AND ans.answer_given IS NOT NULL
                        AND ans.is_correct = 0
                        GROUP BY att.user_id
                    ) AS unique_incorrect_users",
                    [$attempt->quiz_id, $question_id]
                );

                $error_percentage = 0;
                if ($total_answers > 0) {
                    $error_percentage = round(($incorrect_answers / $total_answers) * 100, 1);
                }

                $detailed_results_with_stats[] = array_merge($detail, [
                    'error_percentage' => $error_percentage,
                    'total_answers' => (int) $total_answers
                ]);
            }

            // Fire action hook
            do_action('qe_quiz_attempt_submitted', $user_id, $attempt->quiz_id, $grading_result);            // Log success
            $this->log_info('Quiz attempt submitted successfully', [
                'attempt_id' => $attempt_id,
                'user_id' => $user_id,
                'quiz_id' => $attempt->quiz_id,
                'score' => $grading_result['score'],
                'passed' => $grading_result['passed']
            ]);

            return $this->success_response([
                'quiz_id' => (int) $attempt->quiz_id,
                'attempt_id' => $attempt_id,
                'score' => $grading_result['score'],
                'score_with_risk' => $grading_result['score_with_risk'],
                'total_questions' => $grading_result['total_questions'],
                'correct_answers' => $grading_result['correct_answers'],
                'total_points' => $grading_result['total_points'],
                'earned_points' => $grading_result['earned_points'],
                'passed' => $grading_result['passed'],
                'detailed_results' => $detailed_results_with_stats,
                'duration_seconds' => $duration_seconds,
                'average_score' => $average_score,
                'average_score_with_risk' => $average_score_with_risk
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_quiz_attempt', [
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
    // PERMISSION CALLBACKS
    // ============================================================

    /**
     * Permission Callback: Verifica si un usuario puede ver los detalles de un intento.
     *
     * @param WP_REST_Request $request
     * @return bool|WP_Error
     */
    public function check_get_details_permission(WP_REST_Request $request)
    {
        $attempt_id = (int) $request['id'];
        $user_id = get_current_user_id();

        if (empty($user_id)) {
            return new WP_Error('not_logged_in', 'Usuario no autenticado.', ['status' => 401]);
        }

        // Un administrador puede ver cualquier intento.
        if (current_user_can('manage_options')) {
            return true;
        }

        // Un usuario solo puede ver sus propios intentos.
        global $wpdb;
        $attempt_owner_id = $wpdb->get_var($wpdb->prepare(
            "SELECT user_id FROM {$this->get_table('quiz_attempts')} WHERE attempt_id = %d",
            $attempt_id
        ));

        if ((int) $attempt_owner_id === $user_id) {
            return true;
        }

        return new WP_Error('rest_forbidden', 'No tienes permiso para ver este resultado.', ['status' => 403]);
    }

    /**
     * Check if user can submit this quiz attempt
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if allowed
     */
    public function check_submit_permission(WP_REST_Request $request)
    {
        // First check base permissions
        $base_check = parent::check_permissions($request);
        if (is_wp_error($base_check)) {
            return $base_check;
        }

        $attempt_id = $request->get_param('attempt_id');
        $user_id = get_current_user_id();

        // Get attempt owner
        $attempt_user_id = $this->db_get_var(
            "SELECT user_id FROM {$this->get_table('quiz_attempts')} WHERE attempt_id = %d",
            [$attempt_id]
        );

        if ($attempt_user_id === null) {
            return new WP_Error(
                'attempt_not_found',
                __('Quiz attempt not found.', 'quiz-extended'),
                ['status' => 404]
            );
        }

        // Check ownership
        if ((int) $attempt_user_id !== $user_id) {
            $this->audit_log->log_security_event('unauthorized_quiz_submit', [
                'user_id' => $user_id,
                'attempt_id' => $attempt_id,
                'attempt_owner' => $attempt_user_id
            ]);

            return new WP_Error(
                'rest_forbidden',
                __('You cannot submit this quiz attempt.', 'quiz-extended'),
                ['status' => 403]
            );
        }

        return true;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Check max attempts limit
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @return bool|WP_Error True if allowed, error otherwise
     */
    private function check_max_attempts($user_id, $quiz_id)
    {
        $max_attempts = get_post_meta($quiz_id, '_max_attempts', true);

        if ($max_attempts === '' || !is_numeric($max_attempts) || absint($max_attempts) === 0) {
            return true; // No limit
        }

        $max_attempts = absint($max_attempts);

        // Count completed attempts
        $attempt_count = $this->db_get_var(
            "SELECT COUNT(*) FROM {$this->get_table('quiz_attempts')} 
             WHERE user_id = %d AND quiz_id = %d AND status = 'completed'",
            [$user_id, $quiz_id]
        );

        if ($attempt_count >= $max_attempts) {
            return $this->error_response(
                'max_attempts_reached',
                sprintf(
                    __('You have reached the maximum number of attempts (%d) for this quiz.', 'quiz-extended'),
                    $max_attempts
                ),
                403
            );
        }

        return true;
    }

    /**
     * Create attempt record
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @param int $course_id Course ID
     * @param int|null $lesson_id Lesson ID
     * @return int|false Attempt ID or false
     */
    private function create_attempt_record($user_id, $quiz_id, $course_id, $lesson_id = null)
    {
        return $this->db_insert('quiz_attempts', [
            'user_id' => $user_id,
            'quiz_id' => $quiz_id,
            'course_id' => $course_id,
            'lesson_id' => $lesson_id,
            'start_time' => $this->get_mysql_timestamp(),
            'status' => 'in-progress'
        ], ['%d', '%d', '%d', '%d', '%s', '%s']);
    }

    /**
     * Prepare quiz questions
     *
     * @param int $quiz_id Quiz ID
     * @return array|WP_Error Questions array or error
     */
    private function prepare_quiz_questions($quiz_id)
    {
        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

        if (empty($question_ids) || !is_array($question_ids)) {
            return $this->error_response(
                'no_questions',
                __('This quiz has no questions assigned.', 'quiz-extended'),
                404
            );
        }

        // Should we randomize?
        $randomize = get_post_meta($quiz_id, '_randomize_questions', true);
        if ($randomize === 'yes' || $randomize === true) {
            shuffle($question_ids);
        }

        $questions = [];

        foreach ($question_ids as $question_id) {
            $question_post = get_post($question_id);

            if (!$question_post || $question_post->post_type !== 'qe_question') {
                continue;
            }

            $options = get_post_meta($question_id, '_question_options', true);
            $formatted_options = [];

            if (is_array($options)) {
                foreach ($options as $key => $option_data) {
                    // Don't send isCorrect flag to frontend
                    $formatted_options[] = [
                        'id' => $key,
                        'text' => isset($option_data['text']) ? sanitize_text_field($option_data['text']) : ''
                    ];
                }
            }

            $questions[] = [
                'id' => $question_post->ID,
                'title' => html_entity_decode($question_post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'content' => $question_post->post_content,
                'type' => get_post_meta($question_id, '_question_type', true),
                'options' => $formatted_options,
                'points' => absint(get_post_meta($question_id, '_points', true) ?: 1)
            ];
        }

        return $questions;
    }

    /**
     * Get quiz settings
     *
     * @param int $quiz_id Quiz ID
     * @return array Quiz settings
     */
    private function get_quiz_settings($quiz_id)
    {
        return [
            'instructions' => get_post_meta($quiz_id, '_quiz_instructions', true),
            'time_limit' => absint(get_post_meta($quiz_id, '_time_limit', true) ?: 0),
            'randomize' => get_post_meta($quiz_id, '_randomize_questions', true) === 'yes'
        ];
    }

    /**
     * Get attempt by ID
     *
     * @param int $attempt_id Attempt ID
     * @return object|WP_Error Attempt object or error
     */
    private function get_attempt($attempt_id)
    {
        $attempt = $this->db_get_row(
            "SELECT * FROM {$this->get_table('quiz_attempts')} WHERE attempt_id = %d",
            [$attempt_id]
        );

        if (!$attempt) {
            return $this->error_response(
                'attempt_not_found',
                __('Quiz attempt not found.', 'quiz-extended'),
                404
            );
        }

        return $attempt;
    }

    /**
     * Grade the attempt
     *
     * @param object $attempt Attempt object
     * @param array $answers Answers array
     * @return array|WP_Error Grading results or error
     */
    private function grade_attempt($attempt, $answers)
    {
        // Contadores
        $correct_answers = 0;
        $total_questions = 0;
        $detailed_results = [];

        // Puntuaciones
        $earned_points_actual = 0;  // Para score_with_risk (puntuación real)
        $earned_points_hypothetical = 0; // Para score (puntuación sin riesgo hipotética)

        $question_ids_in_quiz = get_post_meta($attempt->quiz_id, '_quiz_question_ids', true);
        if (!is_array($question_ids_in_quiz)) {
            $question_ids_in_quiz = [];
        }
        $total_questions = count($question_ids_in_quiz);

        // Crear un mapa de respuestas para un acceso más rápido
        $answers_map = [];
        foreach ($answers as $answer) {
            if (isset($answer['question_id'])) {
                $answers_map[$answer['question_id']] = $answer;
            }
        }

        // Iterar sobre TODAS las preguntas del cuestionario
        foreach ($question_ids_in_quiz as $question_id) {
            $answer = $answers_map[$question_id] ?? ['question_id' => $question_id];

            // 🔥 CORRECCIÓN: Verificar si answer_given existe y no es null
            $answer_given = null;
            if (array_key_exists('answer_given', $answer) && $answer['answer_given'] !== null) {
                // Convertir a entero para comparaciones consistentes
                $answer_given = intval($answer['answer_given']);
            }

            $is_risked = isset($answer['is_risked']) && $answer['is_risked'] === true;

            $options = get_post_meta($question_id, '_question_options', true);
            $is_correct = false;
            $correct_answer_id = null;
            $number_of_options = is_array($options) ? count($options) : 1;
            $penalty = ($number_of_options > 0) ? (1 / $number_of_options) : 0;

            if (is_array($options)) {
                foreach ($options as $option) {
                    if (isset($option['isCorrect']) && $option['isCorrect']) {
                        $correct_answer_id = isset($option['id']) ? intval($option['id']) : null;
                        // 🔥 CORRECCIÓN: Comparación estricta con valores enteros
                        if ($answer_given !== null && isset($option['id']) && intval($option['id']) === $answer_given) {
                            $is_correct = true;
                        }
                        break;
                    }
                }
            }

            if ($is_correct) {
                $correct_answers++;
                $earned_points_actual += 1;
                $earned_points_hypothetical += 1;
            } elseif ($answer_given !== null) {
                // Solo penalizar si la pregunta fue contestada INCORRECTAMENTE
                // Las preguntas sin contestar (answer_given === null) NO se penalizan

                // Penalización siempre para el score hipotético
                $earned_points_hypothetical -= $penalty;

                // Penalización para el score real solo si NO tiene riesgo
                if (!$is_risked) {
                    $earned_points_actual -= $penalty;
                }
            }
            // Si answer_given === null (sin contestar), no se suma ni se resta nada

            $detailed_results[] = [
                'question_id' => $question_id,
                'answer_given' => $answer_given,
                'correct_answer' => $correct_answer_id,
                'is_correct' => $is_correct,
                'is_risked' => $is_risked,
            ];

            $this->db_insert('attempt_answers', [
                'attempt_id' => $attempt->attempt_id,
                'question_id' => $question_id,
                'answer_given' => $answer_given,
                'is_correct' => $is_correct ? 1 : 0,
                'is_risked' => $is_risked ? 1 : 0
            ], ['%d', '%d', '%s', '%d', '%d']);

            // Update user question stats
            $answer_status = 'unanswered';
            if ($answer_given !== null) {
                $answer_status = $is_correct ? 'correct' : 'incorrect';
            }

            $this->update_user_question_stats(
                $attempt->user_id,
                $question_id,
                $attempt->course_id,
                $answer_status
            );
        }

        // Calcular puntuaciones finales en escala 0-10 (sistema nuevo)
        $total_possible_points = $total_questions > 0 ? $total_questions : 1;

        // Calculamos directamente en 0-10 (no multiplicamos por 100)
        $score = round(($earned_points_hypothetical / $total_possible_points) * 10, 2);
        $score = max(0, $score);

        $score_with_risk = round(($earned_points_actual / $total_possible_points) * 10, 2);
        $score_with_risk = max(0, $score_with_risk);

        // Nota de aprobación también en escala 0-10 (5.0 = 50% de antes)
        $passing_score_raw = absint(get_post_meta($attempt->quiz_id, '_passing_score', true) ?: 5);
        // Si el valor guardado parece estar en 0-100, convertir a 0-10
        $passing_score = $passing_score_raw > 10 ? ($passing_score_raw / 10) : $passing_score_raw;

        // La aprobación se basa en la puntuación real (score_with_risk)
        $passed = $score_with_risk >= $passing_score;

        return [
            'score' => $score,
            'score_with_risk' => $score_with_risk,
            'total_questions' => $total_questions,
            'correct_answers' => $correct_answers,
            'total_points' => $total_possible_points,
            'earned_points' => $earned_points_actual,
            'passed' => $passed,
            'detailed_results' => $detailed_results
        ];
    }


    /**
     * Complete the attempt
     *
     * @param int $attempt_id Attempt ID
     * @param array $grading_result Grading results
     * @return bool Success
     */
    private function complete_attempt($attempt_id, $grading_result, $attempt)
    {
        // 🔥 NUEVO: Calcular la duración
        $start_time = strtotime($attempt->start_time);
        $end_time = time();
        $time_taken_seconds = $end_time - $start_time;

        return $this->db_update(
            'quiz_attempts',
            [
                'end_time' => date('Y-m-d H:i:s', $end_time),
                'score' => $grading_result['score'],
                'score_with_risk' => $grading_result['score_with_risk'],
                'status' => 'completed',
                'time_taken_seconds' => $time_taken_seconds // 🔥 NUEVO: Guardar duración
            ],
            ['attempt_id' => $attempt_id],
            ['%s', '%f', '%f', '%s', '%d'],
            ['%d']
        );
    }

    /**
     * Clear quiz autosave for a user after successful submission
     * 
     * This is a server-side cleanup to handle edge cases where the frontend
     * fails to clear the autosave (network errors, browser closed, etc.)
     *
     * @param int $user_id User ID
     * @param int $quiz_id Quiz ID
     * @return bool True if deleted or didn't exist, false on error
     * @since 2.0.0
     */
    private function clear_quiz_autosave($user_id, $quiz_id)
    {
        try {
            global $wpdb;
            $table = $wpdb->prefix . 'qe_quiz_autosave';

            // Check if table exists to avoid errors on older installations
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'") === $table;
            if (!$table_exists) {
                return true; // Table doesn't exist, nothing to clean
            }

            $result = $wpdb->delete(
                $table,
                [
                    'user_id' => $user_id,
                    'quiz_id' => $quiz_id,
                ],
                ['%d', '%d']
            );

            if ($result !== false) {
                if ($result > 0) {
                    $this->log_info('Cleared quiz autosave after submission', [
                        'user_id' => $user_id,
                        'quiz_id' => $quiz_id,
                    ]);
                }
                return true;
            }

            $this->log_error('Failed to clear quiz autosave', [
                'user_id' => $user_id,
                'quiz_id' => $quiz_id,
                'db_error' => $wpdb->last_error,
            ]);
            return false;

        } catch (Exception $e) {
            // Don't fail the submission if autosave cleanup fails
            $this->log_error('Exception clearing quiz autosave', [
                'user_id' => $user_id,
                'quiz_id' => $quiz_id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Update user rankings
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @param array $grading_result Grading results
     * @return void
     */
    private function update_rankings($user_id, $course_id, $grading_result)
    {
        try {
            // Get all completed attempts for this user/course
            $attempts = $this->db_get_results(
                "SELECT score, score_with_risk 
                 FROM {$this->get_table('quiz_attempts')} 
                 WHERE user_id = %d AND course_id = %d AND status = 'completed'",
                [$user_id, $course_id]
            );

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
            $existing = $this->db_get_var(
                "SELECT ranking_id FROM {$this->get_table('rankings')} 
                 WHERE user_id = %d AND course_id = %d",
                [$user_id, $course_id]
            );

            if ($existing) {
                // Update existing
                $this->db_update(
                    'rankings',
                    [
                        'average_score' => $average_score,
                        'average_score_with_risk' => $average_score_with_risk,
                        'total_quizzes_completed' => $count,
                        'last_updated' => $this->get_mysql_timestamp()
                    ],
                    ['ranking_id' => $existing],
                    ['%f', '%f', '%d', '%s'],
                    ['%d']
                );
            } else {
                // Insert new
                $this->db_insert('rankings', [
                    'user_id' => $user_id,
                    'course_id' => $course_id,
                    'average_score' => $average_score,
                    'average_score_with_risk' => $average_score_with_risk,
                    'total_quizzes_completed' => $count,
                    'is_fake_user' => 0,
                    'last_updated' => $this->get_mysql_timestamp()
                ], ['%d', '%d', '%f', '%f', '%d', '%d', '%s']);
            }

            $this->log_info('User ranking updated', [
                'user_id' => $user_id,
                'course_id' => $course_id,
                'average_score' => $average_score,
                'average_score_with_risk' => $average_score_with_risk
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in update_rankings', [
                'message' => $e->getMessage(),
                'user_id' => $user_id,
                'course_id' => $course_id
            ]);
        }
    }

    /**
     * 🔥 NUEVO MÉTODO: Calcula los resultados para un cuestionario generado dinámicamente.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function calculate_generated_quiz(WP_REST_Request $request)
    {
        try {
            $answers = $request->get_param('answers');
            $question_ids = $request->get_param('question_ids');
            $user_id = get_current_user_id();

            $this->log_api_call('/quiz-generator/calculate-results', [
                'user_id' => $user_id,
                'question_count' => count($question_ids)
            ]);

            // Reutilizamos la lógica de grade_attempt pero sin el objeto $attempt
            // y sin guardar en la base de datos.
            $grading_result = $this->grade_soft_attempt($question_ids, $answers);

            if (is_wp_error($grading_result)) {
                return $grading_result;
            }

            // No guardamos nada, solo devolvemos el resultado.
            return $this->success_response([
                'score' => $grading_result['score'],
                'score_with_risk' => $grading_result['score_with_risk'],
                'total_questions' => $grading_result['total_questions'],
                'correct_answers' => $grading_result['correct_answers'],
                'passed' => $grading_result['passed'],
                'detailed_results' => $grading_result['detailed_results'],
                'duration_seconds' => $request->get_param('duration') ?: 0
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in calculate_generated_quiz', [
                'message' => $e->getMessage()
            ]);
            return $this->error_response('internal_error', 'An unexpected error occurred.', 500);
        }
    }

    /**
     * 🔥 NUEVO MÉTODO AUXILIAR: Versión "soft" de grade_attempt que no interactúa con la BD.
     *
     * @param array $question_ids_in_quiz
     * @param array $answers
     * @return array|WP_Error
     */
    private function grade_soft_attempt($question_ids_in_quiz, $answers)
    {
        $correct_answers = 0;
        $detailed_results = [];
        $earned_points_actual = 0;
        $earned_points_hypothetical = 0;
        $total_questions = count($question_ids_in_quiz);

        $answers_map = [];
        foreach ($answers as $answer) {
            if (isset($answer['question_id'])) {
                $answers_map[$answer['question_id']] = $answer;
            }
        }

        foreach ($question_ids_in_quiz as $question_id) {
            $answer = $answers_map[$question_id] ?? ['question_id' => $question_id];

            // 🔥 CORRECCIÓN: Verificar si answer_given existe y no es null
            $answer_given = null;
            if (array_key_exists('answer_given', $answer) && $answer['answer_given'] !== null) {
                // Convertir a entero para comparaciones consistentes
                $answer_given = intval($answer['answer_given']);
            }

            $is_risked = isset($answer['is_risked']) && $answer['is_risked'] === true;

            $options = get_post_meta($question_id, '_question_options', true);
            $is_correct = false;
            $correct_answer_id = null;
            $number_of_options = is_array($options) ? count($options) : 1;
            $penalty = ($number_of_options > 0) ? (1 / $number_of_options) : 0;

            if (is_array($options)) {
                foreach ($options as $option) {
                    if (isset($option['isCorrect']) && $option['isCorrect']) {
                        $correct_answer_id = isset($option['id']) ? intval($option['id']) : null;
                        // 🔥 CORRECCIÓN: Comparación estricta con valores enteros
                        if ($answer_given !== null && isset($option['id']) && intval($option['id']) === $answer_given) {
                            $is_correct = true;
                        }
                        break;
                    }
                }
            }

            if ($is_correct) {
                $correct_answers++;
                $earned_points_actual += 1;
                $earned_points_hypothetical += 1;
            } elseif ($answer_given !== null) {
                // Solo penalizar si la pregunta fue contestada INCORRECTAMENTE
                $earned_points_hypothetical -= $penalty;
                if (!$is_risked) {
                    $earned_points_actual -= $penalty;
                }
            }

            $detailed_results[] = [
                'question_id' => intval($question_id),
                'answer_given' => $answer_given,
                'correct_answer' => $correct_answer_id,
                'is_correct' => $is_correct,
                'is_risked' => $is_risked,
            ];
        }

        $total_possible_points = $total_questions > 0 ? $total_questions : 1;

        // Calculamos directamente en 0-10 (no multiplicamos por 100)
        $score = max(0, round(($earned_points_hypothetical / $total_possible_points) * 10, 2));
        $score_with_risk = max(0, round(($earned_points_actual / $total_possible_points) * 10, 2));

        // Para cuestionarios "soft", asumimos un 5.0 (50% en el sistema antiguo) para aprobar por defecto
        $passing_score = 5.0;
        $passed = $score_with_risk >= $passing_score;

        return [
            'score' => $score,
            'score_with_risk' => $score_with_risk,
            'total_questions' => $total_questions,
            'correct_answers' => $correct_answers,
            'passed' => $passed,
            'detailed_results' => $detailed_results
        ];
    }

    /**
     * Update user question statistics
     *
     * Updates or inserts the most recent answer state for a question by a user.
     * This allows tracking of correct/incorrect/unanswered stats per question.
     *
     * @param int $user_id User ID
     * @param int $question_id Question ID
     * @param int $course_id Course ID
     * @param string $answer_status Status: 'correct', 'incorrect', or 'unanswered'
     * @return bool Success
     */
    private function update_user_question_stats($user_id, $question_id, $course_id, $answer_status)
    {
        global $wpdb;
        $table_name = $this->get_table('user_question_stats');

        // Check if record exists
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$table_name} WHERE user_id = %d AND question_id = %d",
            $user_id,
            $question_id
        ));

        if ($existing) {
            // Update existing record
            return $wpdb->update(
                $table_name,
                [
                    'last_answer_status' => $answer_status,
                    'last_answered_at' => current_time('mysql')
                ],
                [
                    'user_id' => $user_id,
                    'question_id' => $question_id
                ],
                ['%s', '%s'],
                ['%d', '%d']
            ) !== false;
        } else {
            // Insert new record
            return $wpdb->insert(
                $table_name,
                [
                    'user_id' => $user_id,
                    'question_id' => $question_id,
                    'course_id' => $course_id,
                    'last_answer_status' => $answer_status,
                    'last_answered_at' => current_time('mysql')
                ],
                ['%d', '%d', '%d', '%s', '%s']
            ) !== false;
        }
    }

    /**
     * 🔧 TEMPORAL: Sync course_ids for all quizzes
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function sync_quiz_course_ids($request)
    {
        try {
            // Verificar que la clase existe
            if (!class_exists('QE_Quiz_Course_Sync')) {
                return $this->error_response(
                    'class_not_found',
                    'QE_Quiz_Course_Sync class not found. Please check if the file is loaded.',
                    500
                );
            }

            // Ejecutar sincronización
            $stats = QE_Quiz_Course_Sync::sync_all_quizzes();

            return new WP_REST_Response([
                'success' => true,
                'data' => $stats,
                'message' => 'Quiz course IDs synchronized successfully'
            ], 200);

        } catch (Exception $e) {
            return $this->error_response(
                'sync_error',
                $e->getMessage(),
                500
            );
        }
    }
}

// Initialize
new QE_Quiz_Attempts_API();