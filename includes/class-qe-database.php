<?php
/**
 * QE_Database Class - REFACTORED VERSION
 *
 * Handles creation and management of custom database tables.
 * Ensures proper schema, charset, and error handling.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    2.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Database
{
    /**
     * Database version for migration tracking
     *
     * @var string
     */
    const DB_VERSION = '2.0.0';

    /**
     * Option name for storing database version
     *
     * @var string
     */
    const DB_VERSION_OPTION = 'qe_db_version';

    /**
     * Create all custom database tables
     *
     * This method is called during plugin activation.
     * It creates all necessary tables with proper charset and indexes.
     *
     * @return bool True if successful, false otherwise
     * @since 1.0.0
     */
    public static function create_tables()
    {
        try {
            global $wpdb;

            $charset_collate = $wpdb->get_charset_collate();
            $prefix = $wpdb->prefix . 'qe_';

            // Require upgrade functions
            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

            self::log_info('Starting database tables creation');

            // Create tables
            $results = [];
            $results['quiz_attempts'] = self::create_quiz_attempts_table($prefix, $charset_collate);
            $results['attempt_answers'] = self::create_attempt_answers_table($prefix, $charset_collate);
            $results['rankings'] = self::create_rankings_table($prefix, $charset_collate);
            $results['student_progress'] = self::create_student_progress_table($prefix, $charset_collate);
            $results['favorite_questions'] = self::create_favorite_questions_table($prefix, $charset_collate);
            $results['question_feedback'] = self::create_question_feedback_table($prefix, $charset_collate);

            // Check if all tables were created successfully
            $all_success = !in_array(false, $results, true);

            if ($all_success) {
                // Update database version
                update_option(self::DB_VERSION_OPTION, self::DB_VERSION);

                self::log_info('All database tables created successfully', [
                    'version' => self::DB_VERSION,
                    'tables' => array_keys($results)
                ]);

                return true;
            } else {
                $failed_tables = array_keys(array_filter($results, function ($result) {
                    return $result === false;
                }));

                self::log_error('Some tables failed to create', [
                    'failed_tables' => $failed_tables
                ]);

                return false;
            }

        } catch (Exception $e) {
            self::log_error('Database table creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return false;
        }
    }

    // ============================================================
    // INDIVIDUAL TABLE CREATION METHODS
    // ============================================================

    /**
     * Create quiz attempts table
     *
     * Stores individual quiz attempt records with scores and timing.
     *
     * @param string $prefix Table prefix
     * @param string $charset_collate Charset collation
     * @return bool True if successful
     * @since 2.0.0
     */
    private static function create_quiz_attempts_table($prefix, $charset_collate)
    {
        try {
            global $wpdb;

            $table_name = $prefix . 'quiz_attempts';

            $sql = "CREATE TABLE {$table_name} (
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
                KEY quiz_id (quiz_id),
                KEY course_id (course_id),
                KEY status (status),
                KEY start_time (start_time)
            ) {$charset_collate};";

            dbDelta($sql);

            // Verify table exists
            if (self::table_exists($table_name)) {
                self::log_info("Table created: {$table_name}");
                return true;
            } else {
                self::log_error("Table creation failed: {$table_name}");
                return false;
            }

        } catch (Exception $e) {
            self::log_error('Failed to create quiz_attempts table', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Create attempt answers table
     *
     * Stores individual answer selections for each quiz attempt.
     *
     * @param string $prefix Table prefix
     * @param string $charset_collate Charset collation
     * @return bool True if successful
     * @since 2.0.0
     */
    private static function create_attempt_answers_table($prefix, $charset_collate)
    {
        try {
            global $wpdb;

            $table_name = $prefix . 'attempt_answers';

            $sql = "CREATE TABLE {$table_name} (
                answer_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                attempt_id BIGINT(20) UNSIGNED NOT NULL,
                question_id BIGINT(20) UNSIGNED NOT NULL,
                answer_given VARCHAR(255) DEFAULT NULL,
                is_correct TINYINT(1) DEFAULT NULL,
                is_risked TINYINT(1) NOT NULL DEFAULT 0,
                PRIMARY KEY (answer_id),
                KEY attempt_id (attempt_id),
                KEY question_id (question_id),
                KEY is_correct (is_correct)
            ) {$charset_collate};";

            dbDelta($sql);

            if (self::table_exists($table_name)) {
                self::log_info("Table created: {$table_name}");
                return true;
            } else {
                self::log_error("Table creation failed: {$table_name}");
                return false;
            }

        } catch (Exception $e) {
            self::log_error('Failed to create attempt_answers table', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Create rankings table
     *
     * Stores course rankings with average scores (with and without risk).
     *
     * @param string $prefix Table prefix
     * @param string $charset_collate Charset collation
     * @return bool True if successful
     * @since 2.0.0
     */
    private static function create_rankings_table($prefix, $charset_collate)
    {
        try {
            global $wpdb;

            $table_name = $prefix . 'rankings';

            $sql = "CREATE TABLE {$table_name} (
                ranking_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT(20) UNSIGNED NOT NULL,
                course_id BIGINT(20) UNSIGNED NOT NULL,
                average_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                average_score_with_risk DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                total_quizzes_completed INT(10) UNSIGNED NOT NULL DEFAULT 0,
                is_fake_user TINYINT(1) NOT NULL DEFAULT 0,
                last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (ranking_id),
                UNIQUE KEY user_course (user_id, course_id),
                KEY course_id (course_id),
                KEY average_score (average_score),
                KEY average_score_with_risk (average_score_with_risk),
                KEY is_fake_user (is_fake_user)
            ) {$charset_collate};";

            dbDelta($sql);

            if (self::table_exists($table_name)) {
                self::log_info("Table created: {$table_name}");
                return true;
            } else {
                self::log_error("Table creation failed: {$table_name}");
                return false;
            }

        } catch (Exception $e) {
            self::log_error('Failed to create rankings table', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Create student progress table
     *
     * Tracks student progress through course content.
     *
     * @param string $prefix Table prefix
     * @param string $charset_collate Charset collation
     * @return bool True if successful
     * @since 2.0.0
     */
    private static function create_student_progress_table($prefix, $charset_collate)
    {
        try {
            global $wpdb;

            $table_name = $prefix . 'student_progress';

            $sql = "CREATE TABLE {$table_name} (
                progress_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT(20) UNSIGNED NOT NULL,
                course_id BIGINT(20) UNSIGNED NOT NULL,
                content_id BIGINT(20) UNSIGNED NOT NULL,
                content_type VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'not-started',
                last_viewed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (progress_id),
                UNIQUE KEY user_content (user_id, content_id),
                KEY user_id (user_id),
                KEY course_id (course_id),
                KEY content_type (content_type),
                KEY status (status)
            ) {$charset_collate};";

            dbDelta($sql);

            if (self::table_exists($table_name)) {
                self::log_info("Table created: {$table_name}");
                return true;
            } else {
                self::log_error("Table creation failed: {$table_name}");
                return false;
            }

        } catch (Exception $e) {
            self::log_error('Failed to create student_progress table', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Create favorite questions table
     *
     * Stores user's favorite questions for later review.
     *
     * @param string $prefix Table prefix
     * @param string $charset_collate Charset collation
     * @return bool True if successful
     * @since 2.0.0
     */
    private static function create_favorite_questions_table($prefix, $charset_collate)
    {
        try {
            global $wpdb;

            $table_name = $prefix . 'favorite_questions';

            $sql = "CREATE TABLE {$table_name} (
                favorite_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT(20) UNSIGNED NOT NULL,
                question_id BIGINT(20) UNSIGNED NOT NULL,
                date_added DATETIME NOT NULL,
                PRIMARY KEY (favorite_id),
                UNIQUE KEY user_question (user_id, question_id),
                KEY user_id (user_id),
                KEY question_id (question_id),
                KEY date_added (date_added)
            ) {$charset_collate};";

            dbDelta($sql);

            if (self::table_exists($table_name)) {
                self::log_info("Table created: {$table_name}");
                return true;
            } else {
                self::log_error("Table creation failed: {$table_name}");
                return false;
            }

        } catch (Exception $e) {
            self::log_error('Failed to create favorite_questions table', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Create question feedback table
     *
     * Stores student feedback, doubts, and challenges on questions.
     *
     * @param string $prefix Table prefix
     * @param string $charset_collate Charset collation
     * @return bool True if successful
     * @since 2.0.0
     */
    private static function create_question_feedback_table($prefix, $charset_collate)
    {
        try {
            global $wpdb;

            $table_name = $prefix . 'question_feedback';

            $sql = "CREATE TABLE {$table_name} (
                feedback_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                question_id BIGINT(20) UNSIGNED NOT NULL,
                user_id BIGINT(20) UNSIGNED NOT NULL,
                feedback_type VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'unresolved',
                date_submitted DATETIME NOT NULL,
                date_resolved DATETIME DEFAULT NULL,
                PRIMARY KEY (feedback_id),
                KEY question_id (question_id),
                KEY user_id (user_id),
                KEY feedback_type (feedback_type),
                KEY status (status),
                KEY date_submitted (date_submitted)
            ) {$charset_collate};";

            dbDelta($sql);

            if (self::table_exists($table_name)) {
                self::log_info("Table created: {$table_name}");
                return true;
            } else {
                self::log_error("Table creation failed: {$table_name}");
                return false;
            }

        } catch (Exception $e) {
            self::log_error('Failed to create question_feedback table', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // ============================================================
    // DATABASE UTILITY METHODS
    // ============================================================

    /**
     * Check if a table exists in the database
     *
     * @param string $table_name Full table name (with prefix)
     * @return bool True if table exists
     * @since 2.0.0
     */
    private static function table_exists($table_name)
    {
        global $wpdb;

        $table_exists = $wpdb->get_var($wpdb->prepare(
            "SHOW TABLES LIKE %s",
            $table_name
        ));

        return $table_exists === $table_name;
    }

    /**
     * Get current database version
     *
     * @return string Database version
     * @since 2.0.0
     */
    public static function get_db_version()
    {
        return get_option(self::DB_VERSION_OPTION, '0.0.0');
    }

    /**
     * Check if database needs upgrade
     *
     * @return bool True if upgrade needed
     * @since 2.0.0
     */
    public static function needs_upgrade()
    {
        $current_version = self::get_db_version();
        return version_compare($current_version, self::DB_VERSION, '<');
    }

    /**
     * Verify all tables exist
     *
     * @return array Array with table names as keys and existence status as values
     * @since 2.0.0
     */
    public static function verify_tables()
    {
        global $wpdb;

        $prefix = $wpdb->prefix . 'qe_';
        $tables = [
            'quiz_attempts',
            'attempt_answers',
            'rankings',
            'student_progress',
            'favorite_questions',
            'question_feedback'
        ];

        $status = [];

        foreach ($tables as $table) {
            $table_name = $prefix . $table;
            $status[$table] = self::table_exists($table_name);
        }

        return $status;
    }

    /**
     * Get database health status
     *
     * @return array Health status information
     * @since 2.0.0
     */
    public static function get_health_status()
    {
        try {
            $tables_status = self::verify_tables();
            $all_tables_exist = !in_array(false, $tables_status, true);

            $health = [
                'status' => $all_tables_exist ? 'healthy' : 'unhealthy',
                'db_version' => self::get_db_version(),
                'expected_version' => self::DB_VERSION,
                'needs_upgrade' => self::needs_upgrade(),
                'tables' => $tables_status,
                'missing_tables' => array_keys(array_filter($tables_status, function ($exists) {
                    return !$exists;
                }))
            ];

            return $health;

        } catch (Exception $e) {
            self::log_error('Failed to get health status', [
                'error' => $e->getMessage()
            ]);

            return [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Repair database tables
     *
     * Attempts to recreate missing tables.
     *
     * @return bool True if all repairs successful
     * @since 2.0.0
     */
    public static function repair_tables()
    {
        try {
            self::log_info('Starting database repair');

            $tables_status = self::verify_tables();
            $missing_tables = array_keys(array_filter($tables_status, function ($exists) {
                return !$exists;
            }));

            if (empty($missing_tables)) {
                self::log_info('No tables need repair');
                return true;
            }

            self::log_info('Repairing missing tables', [
                'missing_tables' => $missing_tables
            ]);

            // Recreate all tables
            $result = self::create_tables();

            if ($result) {
                self::log_info('Database repair completed successfully');
            } else {
                self::log_error('Database repair completed with errors');
            }

            return $result;

        } catch (Exception $e) {
            self::log_error('Database repair failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get table statistics
     *
     * @return array Table row counts and sizes
     * @since 2.0.0
     */
    public static function get_table_stats()
    {
        try {
            global $wpdb;

            $prefix = $wpdb->prefix . 'qe_';
            $tables = [
                'quiz_attempts',
                'attempt_answers',
                'rankings',
                'student_progress',
                'favorite_questions',
                'question_feedback'
            ];

            $stats = [];

            foreach ($tables as $table) {
                $table_name = $prefix . $table;

                if (!self::table_exists($table_name)) {
                    $stats[$table] = [
                        'exists' => false,
                        'rows' => 0,
                        'size' => 0
                    ];
                    continue;
                }

                // Get row count
                $row_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_name}");

                // Get table size
                $size_query = $wpdb->get_row($wpdb->prepare(
                    "SELECT 
                        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
                     FROM information_schema.TABLES 
                     WHERE table_schema = %s 
                     AND table_name = %s",
                    DB_NAME,
                    $table_name
                ));

                $stats[$table] = [
                    'exists' => true,
                    'rows' => (int) $row_count,
                    'size_mb' => $size_query ? (float) $size_query->size_mb : 0
                ];
            }

            return $stats;

        } catch (Exception $e) {
            self::log_error('Failed to get table stats', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Optimize database tables
     *
     * Runs OPTIMIZE TABLE on all custom tables.
     *
     * @return bool True if successful
     * @since 2.0.0
     */
    public static function optimize_tables()
    {
        try {
            global $wpdb;

            self::log_info('Starting database optimization');

            $prefix = $wpdb->prefix . 'qe_';
            $tables = [
                'quiz_attempts',
                'attempt_answers',
                'rankings',
                'student_progress',
                'favorite_questions',
                'question_feedback'
            ];

            foreach ($tables as $table) {
                $table_name = $prefix . $table;

                if (self::table_exists($table_name)) {
                    $result = $wpdb->query("OPTIMIZE TABLE {$table_name}");

                    if ($result !== false) {
                        self::log_info("Optimized table: {$table_name}");
                    } else {
                        self::log_error("Failed to optimize table: {$table_name}");
                    }
                }
            }

            self::log_info('Database optimization completed');
            return true;

        } catch (Exception $e) {
            self::log_error('Database optimization failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // ============================================================
    // LOGGING METHODS
    // ============================================================

    /**
     * Log error message with context
     *
     * @param string $message Error message
     * @param array $context Additional context data
     * @return void
     * @since 2.0.0
     */
    private static function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Database ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info message with context
     *
     * @param string $message Info message
     * @param array $context Additional context data
     * @return void
     * @since 2.0.0
     */
    private static function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Database INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}