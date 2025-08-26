<?php
/**
 * QE_Database Class
 *
 * Esta clase es responsable de crear y gestionar las tablas personalizadas
 * en la base de datos necesarias para el plugin Quiz Extended.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @author     Tu Nombre <tu@email.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Database
{

    /**
     * Crea todas las tablas personalizadas necesarias para el plugin.
     *
     * @since 1.0.0
     * @static
     */
    public static function create_tables()
    {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        $prefix = $wpdb->prefix . 'qe_';

        // 1. Tabla para los intentos de los cuestionarios (wp_qe_quiz_attempts)
        $table_name_attempts = $prefix . 'quiz_attempts';
        $sql_attempts = "CREATE TABLE $table_name_attempts (
            attempt_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            quiz_id BIGINT(20) UNSIGNED NOT NULL,
            course_id BIGINT(20) UNSIGNED NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME DEFAULT NULL,
            score DECIMAL(5,2) DEFAULT 0.00,
            score_with_risk DECIMAL(5,2) DEFAULT 0.00,
            status VARCHAR(20) NOT NULL DEFAULT 'in-progress',
            PRIMARY KEY (attempt_id),
            KEY user_id (user_id),
            KEY quiz_id (quiz_id)
        ) $charset_collate;";
        dbDelta($sql_attempts);

        // --- NUEVA TABLA AÑADIDA ---
        // 2. Tabla para las respuestas de cada intento (wp_qe_attempt_answers)
        $table_name_answers = $prefix . 'attempt_answers';
        $sql_answers = "CREATE TABLE $table_name_answers (
            answer_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            attempt_id BIGINT(20) UNSIGNED NOT NULL,
            question_id BIGINT(20) UNSIGNED NOT NULL,
            answer_given VARCHAR(255) DEFAULT NULL, -- ID de la opción elegida
            is_correct BOOLEAN DEFAULT NULL,
            is_risked BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (answer_id),
            KEY attempt_id (attempt_id)
        ) $charset_collate;";
        dbDelta($sql_answers);
        // --- FIN DE LA NUEVA TABLA ---

        // 3. Tabla para los rankings (wp_qe_rankings)
        $table_name_rankings = $prefix . 'rankings';
        $sql_rankings = "CREATE TABLE $table_name_rankings (
            ranking_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            course_id BIGINT(20) UNSIGNED NOT NULL,
            average_score DECIMAL(5,2) NOT NULL,
            average_score_with_risk DECIMAL(5,2) NOT NULL,
            total_quizzes_completed INT(10) UNSIGNED NOT NULL,
            is_fake_user BOOLEAN NOT NULL DEFAULT FALSE,
            last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (ranking_id),
            UNIQUE KEY user_course (user_id, course_id)
        ) $charset_collate;";
        dbDelta($sql_rankings);

        // 4. Tabla para el progreso del estudiante (wp_qe_student_progress)
        $table_name_progress = $prefix . 'student_progress';
        $sql_progress = "CREATE TABLE $table_name_progress (
            progress_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            course_id BIGINT(20) UNSIGNED NOT NULL,
            content_id BIGINT(20) UNSIGNED NOT NULL,
            content_type VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'not-started',
            last_viewed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (progress_id),
            UNIQUE KEY user_content (user_id, content_id)
        ) $charset_collate;";
        dbDelta($sql_progress);

        // 5. Tabla para preguntas favoritas (wp_qe_favorite_questions)
        $table_name_favorites = $prefix . 'favorite_questions';
        $sql_favorites = "CREATE TABLE $table_name_favorites (
            favorite_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            question_id BIGINT(20) UNSIGNED NOT NULL,
            date_added DATETIME NOT NULL,
            PRIMARY KEY (favorite_id),
            UNIQUE KEY user_question (user_id, question_id)
        ) $charset_collate;";
        dbDelta($sql_favorites);

        // 6. Tabla para dudas e impugnaciones (wp_qe_question_feedback)
        $table_name_feedback = $prefix . 'question_feedback';
        $sql_feedback = "CREATE TABLE $table_name_feedback (
            feedback_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            question_id BIGINT(20) UNSIGNED NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            feedback_type VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'unresolved',
            date_submitted DATETIME NOT NULL,
            date_resolved DATETIME DEFAULT NULL,
            PRIMARY KEY (feedback_id),
            KEY question_id (question_id)
        ) $charset_collate;";
        dbDelta($sql_feedback);
    }
}