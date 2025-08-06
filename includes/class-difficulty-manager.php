<?php
if (!defined('ABSPATH')) {
    exit;
}

class QuizExtended_Difficulty_Manager {
    
    public function __construct() {
        // Hooks para integración con el frontend de Tutor
        add_filter('tutor_quiz_question_content', array($this, 'add_difficulty_indicator'), 10, 2);
        add_action('tutor_quiz_answer_submitted', array($this, 'track_question_performance'), 10, 4);
        
        // Enqueue scripts en frontend
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        
        // Hook para tracking personalizado cuando se envía el quiz
        add_action('tutor_quiz/attempt_ended', array($this, 'track_quiz_attempt_answers'), 10, 3);
    }
    
    public function add_difficulty_indicator($content, $question) {
        $settings = QuizExtended_Database::get_config('general_settings', array('show_difficulty_frontend' => true));
        
        if (!$settings['show_difficulty_frontend']) {
            return $content;
        }
        
        $difficulty = QuizExtended_Database::get_question_difficulty($question->question_id);
        
        $difficulty_labels = array(
            'easy' => __('Fácil', 'quiz-extended'),
            'medium' => __('Medio', 'quiz-extended'),
            'hard' => __('Difícil', 'quiz-extended')
        );
        
        $label = $difficulty_labels[$difficulty] ?? $difficulty_labels['medium'];
        
        $difficulty_html = sprintf(
            '<div class="qe-question-difficulty qe-difficulty-%s">
                <span class="qe-difficulty-icon"></span>
                <span class="qe-difficulty-label">%s</span>
            </div>',
            esc_attr($difficulty),
            esc_html($label)
        );
        
        return $difficulty_html . $content;
    }
    
    public function track_question_performance($question_id, $user_id, $quiz_id, $is_correct) {
        $settings = QuizExtended_Database::get_config('general_settings', array('auto_track_performance' => true));
        
        if (!$settings['auto_track_performance']) {
            return;
        }
        
        QuizExtended_Database::track_question_performance($question_id, $user_id, $quiz_id, $is_correct);
    }
    
    public function track_quiz_attempt_answers($attempt_id, $quiz_id, $user_id) {
        global $wpdb;
        
        $settings = QuizExtended_Database::get_config('general_settings', array('auto_track_performance' => true));
        
        if (!$settings['auto_track_performance']) {
            return;
        }
        
        // Obtener las respuestas del intento
        $answers = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT question_id, is_correct 
                 FROM {$wpdb->prefix}tutor_quiz_attempt_answers 
                 WHERE quiz_attempt_id = %d",
                $attempt_id
            )
        );
        
        foreach ($answers as $answer) {
            QuizExtended_Database::track_question_performance(
                $answer->question_id,
                $user_id,
                $quiz_id,
                $answer->is_correct
            );
        }
    }
    
    public function enqueue_frontend_scripts() {
        if (is_singular('tutor_quiz') || tutor_utils()->is_tutor_quiz()) {
            wp_enqueue_style('quiz-extended-frontend', QUIZ_EXTENDED_URL . 'assets/css/frontend.css', array(), QUIZ_EXTENDED_VERSION);
            wp_enqueue_script('quiz-extended-frontend', QUIZ_EXTENDED_URL . 'assets/js/frontend.js', array('jquery'), QUIZ_EXTENDED_VERSION, true);
        }
    }
}