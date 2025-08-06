<?php
if (!defined('ABSPATH')) {
    exit;
}

class QuizExtended_Hooks {

    public function __construct() {
        // Hooks adicionales para integraciones futuras
        add_action('tutor_quiz_completed', array($this, 'on_quiz_completed'), 10, 3);
        add_action('tutor_quiz_started', array($this, 'on_quiz_started'), 10, 2);
        add_action('tutor_quiz_question_answered', array($this, 'on_question_answered'), 10, 4);
        
        // Hooks para modificar el comportamiento de las preguntas
        add_filter('tutor_quiz_questions', array($this, 'modify_quiz_questions'), 10, 2);
        add_filter('tutor_quiz_question_types', array($this, 'add_difficulty_to_question_types'), 10, 1);
        
        // Hooks para reportes y análisis
        add_action('tutor_quiz_attempt_submitted', array($this, 'analyze_attempt_difficulty'), 10, 2);
        
        // Hooks para integración con otros plugins
        add_filter('quiz_extended_difficulty_calculation', array($this, 'custom_difficulty_calculation'), 10, 3);
    }
    
    /**
     * Acción cuando se completa un quiz
     */
    public function on_quiz_completed($quiz_id, $user_id, $attempt_id) {
        // Registrar evento de completación del quiz
        error_log("Quiz Extended: Quiz {$quiz_id} completado por usuario {$user_id}");
        
        // Analizar el rendimiento del usuario en diferentes dificultades
        $this->analyze_user_performance($quiz_id, $user_id, $attempt_id);
        
        // Hook personalizable para otros plugins
        do_action('quiz_extended_quiz_completed', $quiz_id, $user_id, $attempt_id);
    }
    
    /**
     * Acción cuando se inicia un quiz
     */
    public function on_quiz_started($quiz_id, $user_id) {
        // Registrar inicio del quiz
        error_log("Quiz Extended: Quiz {$quiz_id} iniciado por usuario {$user_id}");
        
        // Preparar datos de dificultad para el intento
        $this->prepare_difficulty_tracking($quiz_id, $user_id);
        
        // Hook personalizable
        do_action('quiz_extended_quiz_started', $quiz_id, $user_id);
    }
    
    /**
     * Acción cuando se responde una pregunta
     */
    public function on_question_answered($question_id, $user_id, $quiz_id, $is_correct) {
        // Obtener la dificultad de la pregunta
        $difficulty = QuizExtended_Database::get_question_difficulty($question_id);
        
        // Registrar la respuesta con su dificultad
        $this->log_question_answer($question_id, $user_id, $quiz_id, $is_correct, $difficulty);
        
        // Hook personalizable
        do_action('quiz_extended_question_answered', $question_id, $user_id, $quiz_id, $is_correct, $difficulty);
    }
    
    /**
     * Modificar las preguntas del quiz para incluir información de dificultad
     */
    public function modify_quiz_questions($questions, $quiz_id) {
        foreach ($questions as &$question) {
            if (isset($question->question_id)) {
                $question->difficulty = QuizExtended_Database::get_question_difficulty($question->question_id);
                $question->difficulty_label = $this->get_difficulty_label($question->difficulty);
            }
        }
        
        return $questions;
    }
    
    /**
     * Agregar información de dificultad a los tipos de preguntas
     */
    public function add_difficulty_to_question_types($question_types) {
        // Agregar metadata de dificultad a todos los tipos
        foreach ($question_types as $type => &$config) {
            $config['supports_difficulty'] = true;
        }
        
        return $question_types;
    }
    
    /**
     * Analizar intento del quiz por dificultad
     */
    public function analyze_attempt_difficulty($attempt_id, $quiz_id) {
        global $wpdb;
        
        // Obtener respuestas del intento con dificultades
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT 
                qa.question_id,
                qa.is_correct,
                q.question_difficulty
            FROM {$wpdb->prefix}tutor_quiz_attempt_answers qa
            JOIN {$wpdb->prefix}tutor_quiz_questions q ON qa.question_id = q.question_id
            WHERE qa.quiz_attempt_id = %d
        ", $attempt_id));
        
        $difficulty_stats = array(
            'easy' => array('correct' => 0, 'total' => 0),
            'medium' => array('correct' => 0, 'total' => 0),
            'hard' => array('correct' => 0, 'total' => 0)
        );
        
        foreach ($results as $result) {
            $difficulty = $result->question_difficulty ?: 'medium';
            $difficulty_stats[$difficulty]['total']++;
            
            if ($result->is_correct) {
                $difficulty_stats[$difficulty]['correct']++;
            }
        }
        
        // Guardar estadísticas del intento
        update_post_meta($attempt_id, '_quiz_extended_difficulty_stats', $difficulty_stats);
        
        return $difficulty_stats;
    }
    
    /**
     * Cálculo personalizado de dificultad
     */
    public function custom_difficulty_calculation($difficulty, $question_id, $context) {
        // Permitir que otros plugins modifiquen el cálculo de dificultad
        
        if ($context === 'auto_assignment') {
            // Lógica adicional para asignación automática
            $question = get_post($question_id);
            if ($question) {
                $word_count = str_word_count(strip_tags($question->post_content));
                
                // Ajustar dificultad basada en longitud de la pregunta
                if ($word_count > 50) {
                    $difficulty = 'hard';
                } elseif ($word_count < 20) {
                    $difficulty = 'easy';
                }
            }
        }
        
        return $difficulty;
    }
    
    /**
     * Analizar rendimiento del usuario por dificultades
     */
    private function analyze_user_performance($quiz_id, $user_id, $attempt_id) {
        $difficulty_stats = $this->analyze_attempt_difficulty($attempt_id, $quiz_id);
        
        // Generar recomendaciones basadas en el rendimiento
        $recommendations = array();
        
        foreach ($difficulty_stats as $difficulty => $stats) {
            if ($stats['total'] > 0) {
                $success_rate = ($stats['correct'] / $stats['total']) * 100;
                
                if ($success_rate < 50) {
                    $recommendations[] = sprintf(
                        __('Considera repasar los temas de dificultad %s (tasa de éxito: %d%%)', 'quiz-extended'),
                        $difficulty,
                        $success_rate
                    );
                }
            }
        }
        
        // Guardar recomendaciones
        if (!empty($recommendations)) {
            update_user_meta($user_id, "_quiz_{$quiz_id}_recommendations", $recommendations);
        }
        
        return $recommendations;
    }
    
    /**
     * Preparar tracking de dificultad para el intento
     */
    private function prepare_difficulty_tracking($quiz_id, $user_id) {
        // Obtener estadísticas de preguntas por dificultad
        $questions = QuizExtended_Database::get_questions_by_difficulty($quiz_id);
        
        $difficulty_distribution = array(
            'easy' => 0,
            'medium' => 0,
            'hard' => 0
        );
        
        foreach ($questions as $question) {
            $difficulty = $question->question_difficulty ?: 'medium';
            $difficulty_distribution[$difficulty]++;
        }
        
        // Almacenar distribución temporalmente para el seguimiento
        set_transient("quiz_difficulty_dist_{$quiz_id}_{$user_id}", $difficulty_distribution, HOUR_IN_SECONDS);
        
        return $difficulty_distribution;
    }
    
    /**
     * Registrar respuesta de pregunta con contexto de dificultad
     */
    private function log_question_answer($question_id, $user_id, $quiz_id, $is_correct, $difficulty) {
        // Log detallado para análisis posterior
        $log_data = array(
            'timestamp' => current_time('mysql'),
            'question_id' => $question_id,
            'user_id' => $user_id,
            'quiz_id' => $quiz_id,
            'is_correct' => $is_correct,
            'difficulty' => $difficulty,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? ''
        );
        
        // Registrar en logs de WordPress si debug está activado
        if (WP_DEBUG_LOG) {
            error_log('Quiz Extended Answer: ' . json_encode($log_data));
        }
        
        // Opcionalmente guardar en custom table para análisis avanzado
        do_action('quiz_extended_log_answer', $log_data);
    }
    
    /**
     * Obtener etiqueta de dificultad localizada
     */
    private function get_difficulty_label($difficulty) {
        $labels = array(
            'easy' => __('Fácil', 'quiz-extended'),
            'medium' => __('Medio', 'quiz-extended'),
            'hard' => __('Difícil', 'quiz-extended')
        );
        
        return $labels[$difficulty] ?? $labels['medium'];
    }
}