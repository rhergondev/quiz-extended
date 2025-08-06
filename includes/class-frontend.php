<?php
if (!defined('ABSPATH')) {
    exit;
}

class QuizExtended_Frontend {

    public function __construct() {
        // Hooks específicos del frontend
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        add_filter('tutor_quiz_question_html', array($this, 'modify_question_html'), 10, 2);
    }
    
    public function enqueue_frontend_scripts() {
        if (is_singular('tutor_quiz') || tutor_utils()->is_tutor_quiz()) {
            wp_enqueue_style('quiz-extended-frontend', QUIZ_EXTENDED_URL . 'assets/css/frontend.css', array(), QUIZ_EXTENDED_VERSION);
            wp_enqueue_script('quiz-extended-frontend', QUIZ_EXTENDED_URL . 'assets/js/frontend.js', array('jquery'), QUIZ_EXTENDED_VERSION, true);
        }
    }
    
    public function modify_question_html($html, $question) {
        // Modificaciones adicionales al HTML de las preguntas si es necesario
        return $html;
    }
}