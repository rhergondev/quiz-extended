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
        // Add custom field to question edit screen
        add_action('tutor_question_editor_right_sidebar_after_question_type', array($this, 'add_difficulty_field_html'));

        // Save the custom field value when the question is saved
        add_action('tutor_after_save_question', array($this, 'save_difficulty_field_value'));
    }

    /**
     * Render the HTML for the difficulty field
     */
    public function add_difficulty_field_html()
    {
        global $post;

        $difficulty_options = array(
            'easy' => __('Easy', 'quiz-extended'),
            'medium' => __('Medium', 'quiz-extended'),
            'hard' => __('Hard', 'quiz-extended'),
        );

        // Get the current difficulty value if it exists
        $current_difficulty = get_post_meta($post->ID, '_question_difficulty', true);
        if (empty($current_difficulty)) {
            $current_difficulty = 'Easy'; // Default value
        }

        ?>
        <div class="tutor-option-field-row">
            <div class="tutor-option-field-label">
                <label for="question_difficulty">
                    <?php _e('Question Difficulty', 'quiz-extended'); ?>
                </label>
            </div>
            <div class="tutor-option-field">
                <select name="question_difficulty" id="question_difficulty">
                    <option value=""><?php _e('Select difficulty', 'quiz-extended'); ?></option>
                    <?php
                    foreach ($difficulty_options as $key => $value) {
                        echo "<option value='{$key}' " . selected($current_difficulty, $key, false) . ">{$value}</option>";
                    }
                    ?>
                </select>
            </div>
        </div>
        <?php
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