<?php
if (!defined('ABSPATH')) {
    exit;
}

class QuizExtended_Database {
    
    public function __construct() {
        add_action('init', array($this, 'check_database_version'));
    }
    
    public function check_database_version() {
        $current_version = get_option('quiz_extended_db_version', '0');
        
        if (version_compare($current_version, QUIZ_EXTENDED_VERSION, '<')) {
            self::create_tables();
            update_option('quiz_extended_db_version', QUIZ_EXTENDED_VERSION);
        }
    }
    
    public static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Extender tabla de preguntas con dificultad
        $table_name = $wpdb->prefix . 'tutor_quiz_questions';
        
        // Verificar si la columna ya existe
        $column_exists = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = %s 
                 AND TABLE_NAME = %s 
                 AND COLUMN_NAME = 'question_difficulty'",
                DB_NAME,
                $table_name
            )
        );
        
        if (empty($column_exists)) {
            $wpdb->query(
                "ALTER TABLE {$table_name} 
                 ADD COLUMN question_difficulty varchar(20) DEFAULT 'medium' AFTER question_order"
            );
        }
        
        // Crear tabla para estadísticas de dificultad
        $stats_table = $wpdb->prefix . 'quiz_extended_difficulty_stats';
        
        $sql = "CREATE TABLE {$stats_table} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            question_id bigint(20) NOT NULL,
            user_id bigint(20) NOT NULL,
            quiz_id bigint(20) NOT NULL,
            is_correct tinyint(1) DEFAULT 0,
            time_spent int(11) DEFAULT 0,
            attempt_date datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY question_id (question_id),
            KEY user_id (user_id),
            KEY quiz_id (quiz_id),
            KEY difficulty_stats (question_id, is_correct)
        ) {$charset_collate};";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Crear tabla para configuraciones extendidas
        $config_table = $wpdb->prefix . 'quiz_extended_config';
        
        $config_sql = "CREATE TABLE {$config_table} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            config_key varchar(100) NOT NULL,
            config_value longtext,
            autoload varchar(20) DEFAULT 'yes',
            PRIMARY KEY (id),
            UNIQUE KEY config_key (config_key)
        ) {$charset_collate};";
        
        dbDelta($config_sql);
    }
    
    public static function get_question_difficulty($question_id) {
        global $wpdb;
        
        $difficulty = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT question_difficulty FROM {$wpdb->prefix}tutor_quiz_questions WHERE question_id = %d",
                $question_id
            )
        );
        
        return $difficulty ?: 'medium';
    }
    
public static function update_question_difficulty($question_id, $difficulty) {
    global $wpdb;
    
    $allowed_difficulties = array('easy', 'medium', 'hard');
    if (!in_array($difficulty, $allowed_difficulties)) {
        return false;
    }
    
    // Verificar que la pregunta existe
    $question_exists = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}tutor_quiz_questions WHERE question_id = %d",
        $question_id
    ));
    
    if (!$question_exists) {
        return false;
    }
    
    return $wpdb->update(
        $wpdb->prefix . 'tutor_quiz_questions',
        array('question_difficulty' => $difficulty),
        array('question_id' => $question_id),
        array('%s'),
        array('%d')
    );
}
    
    public static function get_questions_by_difficulty($quiz_id, $difficulty = null) {
        global $wpdb;
        
        $where_clause = "WHERE quiz_id = %d";
        $params = array($quiz_id);
        
        if ($difficulty && in_array($difficulty, array('easy', 'medium', 'hard'))) {
            $where_clause .= " AND question_difficulty = %s";
            $params[] = $difficulty;
        }
        
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}tutor_quiz_questions {$where_clause} ORDER BY question_order ASC",
                ...$params
            )
        );
    }
    
    public static function get_difficulty_stats($quiz_id = null) {
        global $wpdb;
        
        $where_clause = $quiz_id ? $wpdb->prepare("WHERE q.quiz_id = %d", $quiz_id) : "";
        
        return $wpdb->get_results(
            "SELECT 
                q.question_difficulty,
                COUNT(DISTINCT q.question_id) as total_questions,
                COALESCE(AVG(CASE WHEN s.is_correct = 1 THEN 1 ELSE 0 END) * 100, 0) as success_rate,
                COALESCE(AVG(s.time_spent), 0) as avg_time_spent,
                COUNT(s.id) as total_attempts
            FROM {$wpdb->prefix}tutor_quiz_questions q
            LEFT JOIN {$wpdb->prefix}quiz_extended_difficulty_stats s ON q.question_id = s.question_id
            {$where_clause}
            GROUP BY q.question_difficulty
            ORDER BY 
                CASE q.question_difficulty 
                    WHEN 'easy' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'hard' THEN 3 
                END"
        );
    }
    
    public static function track_question_performance($question_id, $user_id, $quiz_id, $is_correct, $time_spent = 0) {
        global $wpdb;
        
        return $wpdb->insert(
            $wpdb->prefix . 'quiz_extended_difficulty_stats',
            array(
                'question_id' => $question_id,
                'user_id' => $user_id,
                'quiz_id' => $quiz_id,
                'is_correct' => $is_correct ? 1 : 0,
                'time_spent' => $time_spent,
                'attempt_date' => current_time('mysql')
            ),
            array('%d', '%d', '%d', '%d', '%d', '%s')
        );
    }
    
    public static function set_config($key, $value) {
        global $wpdb;
        
        return $wpdb->replace(
            $wpdb->prefix . 'quiz_extended_config',
            array(
                'config_key' => $key,
                'config_value' => maybe_serialize($value)
            ),
            array('%s', '%s')
        );
    }
    
    public static function get_config($key, $default = null) {
        global $wpdb;
        
        $value = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT config_value FROM {$wpdb->prefix}quiz_extended_config WHERE config_key = %s",
                $key
            )
        );
        
        return $value ? maybe_unserialize($value) : $default;
    }
}