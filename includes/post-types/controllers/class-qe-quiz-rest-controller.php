<?php
/**
 * QE_Quiz_REST_Controller Class
 *
 * Custom REST controller for Quiz post type
 * Overrides default WordPress permission checks
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

class QE_Quiz_REST_Controller extends WP_REST_Posts_Controller
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('quiz');
        $this->namespace = 'wp/v2';
        $this->rest_base = 'quiz';
    }

    /**
     * Check if a given request has access to create items
     *
     * @param WP_REST_Request $request Full details about the request.
     * @return true|WP_Error True if the request has access to create items, WP_Error object otherwise.
     */
    public function create_item_permissions_check($request)
    {
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in to create quizzes.', 'quiz-extended'),
                array('status' => 401)
            );
        }

        // Check if user has create_quizzes capability
        if (!current_user_can('create_quizzes') && !current_user_can('manage_lms')) {
            return new WP_Error(
                'rest_cannot_create',
                __('You do not have permission to create quizzes.', 'quiz-extended'),
                array('status' => 403)
            );
        }

        return true;
    }

    /**
     * Check if a given request has access to update an item
     *
     * @param WP_REST_Request $request Full details about the request.
     * @return true|WP_Error True if the request has access to update the item, WP_Error object otherwise.
     */
    public function update_item_permissions_check($request)
    {
        $quiz = $this->get_post($request['id']);

        if (is_wp_error($quiz)) {
            return $quiz;
        }

        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in to edit quizzes.', 'quiz-extended'),
                array('status' => 401)
            );
        }

        // Admins can edit everything
        if (current_user_can('manage_lms')) {
            return true;
        }

        // Check if user owns the quiz
        if ((int) $quiz->post_author === get_current_user_id()) {
            if (current_user_can('edit_quizzes')) {
                return true;
            }
        }

        // Check if can edit others
        if (current_user_can('edit_others_quizzes')) {
            return true;
        }

        return new WP_Error(
            'rest_cannot_edit',
            __('You do not have permission to edit this quiz.', 'quiz-extended'),
            array('status' => 403)
        );
    }

    /**
     * Check if a given request has access to delete an item
     *
     * @param WP_REST_Request $request Full details about the request.
     * @return true|WP_Error True if the request has access to delete the item, WP_Error object otherwise.
     */
    public function delete_item_permissions_check($request)
    {
        $quiz = $this->get_post($request['id']);

        if (is_wp_error($quiz)) {
            return $quiz;
        }

        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You must be logged in to delete quizzes.', 'quiz-extended'),
                array('status' => 401)
            );
        }

        // Admins can delete everything
        if (current_user_can('manage_lms')) {
            return true;
        }

        // Check if user owns the quiz
        if ((int) $quiz->post_author === get_current_user_id()) {
            if (current_user_can('delete_quizzes')) {
                return true;
            }
        }

        // Check if can delete others
        if (current_user_can('delete_others_quizzes')) {
            return true;
        }

        return new WP_Error(
            'rest_cannot_delete',
            __('You do not have permission to delete this quiz.', 'quiz-extended'),
            array('status' => 403)
        );
    }
}