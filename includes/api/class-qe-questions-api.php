<?php
/**
 * QE_Questions_API Class
 *
 * Custom question endpoints (not covered by the WP REST post controller).
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 */

if (!defined('ABSPATH')) {
    exit;
}

class QE_Questions_API extends QE_API_Base
{
    public function __construct()
    {
        parent::__construct();
        $this->namespace = 'qe/v1';
    }

    public function register_routes()
    {
        // GET /qe/v1/questions/quiz-membership?ids=1,2,3
        register_rest_route($this->namespace, '/questions/quiz-membership', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_quiz_membership'],
            'permission_callback' => [$this, 'check_permissions'],
            'args' => [
                'ids' => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);
    }

    /**
     * Returns a map of questionId → [{id, title}] for all quizzes that contain each question.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_quiz_membership(WP_REST_Request $request)
    {
        $ids_param    = $request->get_param('ids');
        $question_ids = array_values(array_filter(array_map('absint', explode(',', $ids_param))));

        if (empty($question_ids)) {
            return new WP_REST_Response(new stdClass(), 200);
        }

        // Pre-fill result map so every requested ID is present in the response
        $result = [];
        foreach ($question_ids as $id) {
            $result[(string) $id] = [];
        }

        // Fetch all published quiz IDs
        $quiz_ids = get_posts([
            'post_type'      => 'qe_quiz',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'fields'         => 'ids',
        ]);

        foreach ($quiz_ids as $quiz_id) {
            $stored_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
            if (!is_array($stored_ids) || empty($stored_ids)) {
                continue;
            }

            $matching = array_intersect($question_ids, array_map('absint', $stored_ids));
            if (empty($matching)) {
                continue;
            }

            $quiz_title = html_entity_decode(get_the_title($quiz_id), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            foreach ($matching as $question_id) {
                $result[(string) $question_id][] = [
                    'id'    => $quiz_id,
                    'title' => $quiz_title,
                ];
            }
        }

        return new WP_REST_Response($result, 200);
    }
}
