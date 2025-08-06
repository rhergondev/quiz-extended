<?php
/**
 * Manages the question difficulty feature.
 *
 * @package QuizExtended\Questions
 * @since 0.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Class Quiz_Extended_Difficulty_Manager
 *
 * Handles adding and saving the custom difficulty field for Tutor LMS questions.
 */

class Quiz_Extended_Difficulty_Manager
{
    /** Constructor */

    public function __construct()
    {
        // Save the custom field value when the question is saved
        add_action('tutor_after_save_question', array($this, 'save_difficulty_field_value'));
    }

    /**
     * Saves the difficulty value to the question's post meta.
     *
     * @param int $post_ID The ID of the question being saved.
     */
    public function save_difficulty_field_value($post_ID)
    {
        if (isset($_POST['question_difficulty'])) {
            $difficulty = sanitize_text_field($_POST['question_difficulty']);
            update_post_meta($post_ID, '_question_difficulty', $difficulty);
        }
    }
}