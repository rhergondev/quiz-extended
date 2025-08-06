<?php
<?php
/**
 * Plugin Name: Quiz Extended
 * Plugin URI: https://github.com/rhergondev/quiz-extended
 * Description: Plugin to extend the functionality of Tutor LMS quizzes with additional features and customizations.
 * Version: 0.1.0
 * Author: Haz Historia
 * Author URI: https://hazhistoria.net
 * Text Domain: quiz-extended
 * Domain Path: /languages
 * Requires PHP: 7.4
 * Requires at least: 5.3
 * License: GPL v3 or later
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes
define('QUIZ_EXTENDED_VERSION', '0.1.0');
define('QUIZ_EXTENDED_FILE', __FILE__);
define('QUIZ_EXTENDED_PATH', plugin_dir_path(__FILE__));
define('QUIZ_EXTENDED_URL', plugin_dir_url(__FILE__));

class QuizExtendedExtension {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    private function init_hooks() {
        add_action('plugins_loaded', array($this, 'check_tutor_dependency'));
        add_action('init', array($this, 'load_textdomain'));
        
        // Solo inicializar si Tutor está activo
        if ($this->is_tutor_active()) {
            $this->init_plugin();
        }
    }
    
    public function check_tutor_dependency() {
        if (!$this->is_tutor_active()) {
            add_action('admin_notices', array($this, 'tutor_not_found_notice'));
            return;
        }
    }
    
    private function is_tutor_active() {
        return function_exists('tutor_lms') || class_exists('TUTOR\\Tutor');
    }
    
    public function tutor_not_found_notice() {
        ?>
        <div class="notice notice-error">
            <p><?php _e('Quiz Extended requiere que Tutor LMS esté instalado y activo.', 'quiz-extended'); ?></p>
        </div>
        <?php
    }
    
    public function load_textdomain() {
        load_plugin_textdomain('quiz-extended', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    private function init_plugin() {
        // Incluir archivos necesarios
        $this->includes();
        
        // Inicializar hooks específicos de Tutor
        $this->tutor_hooks();
        
        // Inicializar integración con formularios de Tutor
        $this->init_tutor_integration();
    }
    
    private function includes() {
        // Incluir clases y archivos necesarios
        require_once QUIZ_EXTENDED_PATH . 'includes/class-database.php';
        require_once QUIZ_EXTENDED_PATH . 'includes/class-admin.php';
        require_once QUIZ_EXTENDED_PATH . 'includes/class-frontend.php';
        require_once QUIZ_EXTENDED_PATH . 'includes/class-hooks.php';
        require_once QUIZ_EXTENDED_PATH . 'includes/class-difficulty-manager.php';
    }
    
    private function tutor_hooks() {
        // Hooks específicos de Tutor
        add_action('tutor_course_complete_after', array($this, 'on_course_complete'));
        add_action('tutor_lesson_completed_after', array($this, 'on_lesson_complete'));
        add_filter('tutor_course_loop_content', array($this, 'modify_course_loop'), 10, 2);
        
        // Inicializar clases
        new QuizExtended_Database();
        new QuizExtended_Admin();
        new QuizExtended_Frontend();
        new QuizExtended_Hooks();
        new QuizExtended_Difficulty_Manager();
    }
    
    /**
     * Inicializar integración específica con Tutor LMS
     */
    private function init_tutor_integration() {
        // Hooks para modificar formularios de preguntas
        add_action('admin_enqueue_scripts', array($this, 'enqueue_tutor_integration_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        
        // Hooks para interceptar y guardar datos de preguntas
        add_action('wp_ajax_tutor_save_quiz_question', array($this, 'intercept_question_save'), 5);
        add_action('wp_ajax_tutor_update_quiz_question', array($this, 'intercept_question_save'), 5);
        
        // Hook después de guardar pregunta
        add_action('tutor_quiz_question_saved', array($this, 'save_question_difficulty'), 10, 2);
        
        // Hooks para mostrar dificultad en frontend
        add_filter('tutor_quiz_question_html', array($this, 'add_difficulty_to_question_display'), 10, 2);
        add_action('tutor_quiz_question_top', array($this, 'display_question_difficulty'));
        
        // Asegurar que existe la columna de dificultad
        add_action('admin_init', array($this, 'ensure_difficulty_column'));
        add_action('init', array($this, 'ensure_difficulty_column'));
    }
    
    /**
     * Asegurar que existe la columna de dificultad
     */
    public function ensure_difficulty_column() {
        global $wpdb;
        
        // Verificar si la columna existe
        $column_exists = $wpdb->get_results($wpdb->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = %s 
            AND COLUMN_NAME = 'question_difficulty'
        ", DB_NAME, $wpdb->prefix . 'tutor_quiz_questions'));
        
        if (empty($column_exists)) {
            // Crear la columna
            $sql = "ALTER TABLE {$wpdb->prefix}tutor_quiz_questions 
                    ADD COLUMN question_difficulty VARCHAR(20) DEFAULT 'medium' 
                    AFTER question_type";
            
            $result = $wpdb->query($sql);
            
            if ($result !== false) {
                error_log('Quiz Extended: Columna question_difficulty creada exitosamente');
            } else {
                error_log('Quiz Extended: Error creando columna question_difficulty - ' . $wpdb->last_error);
            }
        }
    }
    
    /**
     * Cargar scripts de integración con Tutor (Admin)
     */
    public function enqueue_tutor_integration_scripts($hook) {
        // Páginas donde cargar los scripts
        $tutor_pages = array(
            'toplevel_page_tutor',
            'tutor_page_tutor_quiz',
            'post.php',
            'post-new.php'
        );
        
        $is_tutor_context = in_array($hook, $tutor_pages) || 
                           (isset($_GET['post_type']) && $_GET['post_type'] === 'tutor_quiz') ||
                           (get_post_type() === 'tutor_quiz') ||
                           strpos($hook, 'tutor') !== false;
        
        if ($is_tutor_context) {
            // JavaScript para integración
            wp_enqueue_script(
                'quiz-extended-tutor-integration',
                QUIZ_EXTENDED_URL . 'assets/js/tutor-integration.js',
                array('jquery'),
                QUIZ_EXTENDED_VERSION,
                true
            );
            
            // CSS para admin
            wp_enqueue_style(
                'quiz-extended-tutor-admin',
                QUIZ_EXTENDED_URL . 'assets/css/tutor-admin.css',
                array(),
                QUIZ_EXTENDED_VERSION
            );
            
            // Localizar script
            wp_localize_script('quiz-extended-tutor-integration', 'quizExtended', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('quiz_extended_nonce'),
                'labels' => array(
                    'difficulty' => __('Dificultad de la Pregunta', 'quiz-extended'),
                    'easy' => __('Fácil', 'quiz-extended'),
                    'medium' => __('Medio', 'quiz-extended'),
                    'hard' => __('Difícil', 'quiz-extended'),
                    'help' => __('Selecciona el nivel de dificultad de esta pregunta', 'quiz-extended')
                ),
                'debug' => array(
                    'hook' => $hook,
                    'post_type' => get_post_type(),
                    'is_tutor_context' => $is_tutor_context
                )
            ));
        }
    }
    
    /**
     * Cargar scripts del frontend
     */
    public function enqueue_frontend_scripts() {
        if (is_singular('tutor_quiz') || $this->is_quiz_page()) {
            wp_enqueue_style(
                'quiz-extended-frontend',
                QUIZ_EXTENDED_URL . 'assets/css/frontend.css',
                array(),
                QUIZ_EXTENDED_VERSION
            );
        }
    }
    
    /**
     * Verificar si estamos en una página de quiz
     */
    private function is_quiz_page() {
        global $post;
        
        if (!$post) return false;
        
        // Verificar si es un quiz de Tutor
        return get_post_type($post) === 'tutor_quiz' || 
               has_shortcode($post->post_content, 'tutor_quiz') ||
               (function_exists('tutor_is_quiz') && tutor_is_quiz());
    }
    
    /**
     * Interceptar guardado de preguntas para capturar dificultad
     */
    public function intercept_question_save() {
        // Verificar nonce si está disponible
        if (isset($_POST['_wpnonce']) && !wp_verify_nonce($_POST['_wpnonce'], 'tutor_nonce')) {
            return;
        }
        
        // Guardar dificultad en transient temporal
        if (isset($_POST['question_difficulty'])) {
            $difficulty = sanitize_text_field($_POST['question_difficulty']);
            $user_id = get_current_user_id();
            set_transient("temp_question_difficulty_{$user_id}", $difficulty, 300);
            
            error_log("Quiz Extended: Dificultad '$difficulty' guardada en transient para usuario $user_id");
        }
    }
    
    /**
     * Guardar dificultad después de que Tutor guarde la pregunta
     */
    public function save_question_difficulty($question_id, $question_data = null) {
        global $wpdb;
        
        $difficulty = null;
        $user_id = get_current_user_id();
        
        // Intentar obtener dificultad de diferentes fuentes
        // 1. Desde POST directo
        if (isset($_POST['question_difficulty'])) {
            $difficulty = sanitize_text_field($_POST['question_difficulty']);
        }
        
        // 2. Desde transient
        if (!$difficulty) {
            $difficulty = get_transient("temp_question_difficulty_{$user_id}");
            if ($difficulty) {
                delete_transient("temp_question_difficulty_{$user_id}");
            }
        }
        
        // 3. Desde datos de pregunta si están disponibles
        if (!$difficulty && is_array($question_data) && isset($question_data['question_difficulty'])) {
            $difficulty = $question_data['question_difficulty'];
        }
        
        // 4. Valor por defecto
        if (!$difficulty) {
            $difficulty = 'medium';
        }
        
        // Validar y guardar
        if (in_array($difficulty, array('easy', 'medium', 'hard'))) {
            $result = $wpdb->update(
                $wpdb->prefix . 'tutor_quiz_questions',
                array('question_difficulty' => $difficulty),
                array('question_id' => $question_id),
                array('%s'),
                array('%d')
            );
            
            if ($result !== false) {
                error_log("Quiz Extended: Dificultad '$difficulty' guardada exitosamente para pregunta $question_id");
            } else {
                error_log("Quiz Extended: Error guardando dificultad para pregunta $question_id - " . $wpdb->last_error);
            }
        } else {
            error_log("Quiz Extended: Dificultad inválida '$difficulty' para pregunta $question_id");
        }
    }
    
    /**
     * Agregar dificultad a la visualización de preguntas
     */
    public function add_difficulty_to_question_display($html, $question) {
        if (is_admin()) return $html;
        
        $question_id = $question->question_id ?? 0;
        if ($question_id) {
            $difficulty = $this->get_question_difficulty($question_id);
            if ($difficulty && $difficulty !== 'medium') { // Solo mostrar si no es medium (por defecto)
                $difficulty_badge = sprintf(
                    '<span class="qe-question-difficulty qe-difficulty-%s"><i class="qe-difficulty-icon"></i>%s</span>',
                    $difficulty,
                    $this->get_difficulty_label($difficulty)
                );
                $html = $difficulty_badge . $html;
            }
        }
        
        return $html;
    }
    
    /**
     * Mostrar dificultad en la parte superior de la pregunta
     */
    public function display_question_difficulty() {
        global $tutor_quiz_question;
        
        if (!$tutor_quiz_question || is_admin()) return;
        
        $difficulty = $this->get_question_difficulty($tutor_quiz_question->question_id);
        if ($difficulty) {
            printf(
                '<div class="qe-question-difficulty-wrapper">
                    <span class="qe-question-difficulty qe-difficulty-%s">
                        <i class="qe-difficulty-icon"></i>
                        %s
                    </span>
                </div>',
                esc_attr($difficulty),
                esc_html($this->get_difficulty_label($difficulty))
            );
        }
    }
    
    /**
     * Obtener dificultad de una pregunta
     */
    private function get_question_difficulty($question_id) {
        global $wpdb;
        
        if (!$question_id) return 'medium';
        
        $difficulty = wp_cache_get("question_difficulty_{$question_id}", 'quiz_extended');
        
        if ($difficulty === false) {
            $difficulty = $wpdb->get_var($wpdb->prepare(
                "SELECT question_difficulty FROM {$wpdb->prefix}tutor_quiz_questions WHERE question_id = %d",
                $question_id
            ));
            
            $difficulty = $difficulty ?: 'medium';
            wp_cache_set("question_difficulty_{$question_id}", $difficulty, 'quiz_extended', 300);
        }
        
        return $difficulty;
    }
    
    /**
     * Obtener etiqueta de dificultad
     */
    private function get_difficulty_label($difficulty) {
        $labels = array(
            'easy' => __('Fácil', 'quiz-extended'),
            'medium' => __('Medio', 'quiz-extended'),
            'hard' => __('Difícil', 'quiz-extended')
        );
        
        return $labels[$difficulty] ?? $labels['medium'];
    }
    
    public function on_course_complete($course_id) {
        // Lógica cuando se completa un curso
        error_log('Quiz Extended: Curso completado - ' . $course_id);
    }
    
    public function on_lesson_complete($lesson_id) {
        // Lógica cuando se completa una lección
        error_log('Quiz Extended: Lección completada - ' . $lesson_id);
    }
    
    public function modify_course_loop($content, $course_id) {
        // Modificar el contenido del loop de cursos si es necesario
        return $content;
    }
    
    public function activate() {
        if (!$this->is_tutor_active()) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(__('Este plugin requiere Tutor LMS para funcionar.', 'quiz-extended'));
        }
        
        // Crear/actualizar tablas y columnas
        $this->ensure_difficulty_column();
        
        if (class_exists('QuizExtended_Database')) {
            QuizExtended_Database::create_tables();
        }
        
        // Limpiar cache
        wp_cache_flush();
        flush_rewrite_rules();
        
        error_log('Quiz Extended: Plugin activado exitosamente');
    }
    
    public function deactivate() {
        // Limpiar transients
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_temp_question_difficulty_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_temp_question_difficulty_%'");
        
        // Limpiar cache
        wp_cache_flush();
        flush_rewrite_rules();
        
        error_log('Quiz Extended: Plugin desactivado');
    }
}

// Inicializar el plugin
function quiz_extended() {
    return QuizExtendedExtension::get_instance();
}

// Activar el plugin
quiz_extended();

// Hooks de activación y desactivación
register_activation_hook(__FILE__, 'quiz_extended_activate');
register_deactivation_hook(__FILE__, 'quiz_extended_deactivate');

function quiz_extended_activate() {
    $instance = quiz_extended();
    $instance->activate();
}

function quiz_extended_deactivate() {
    $instance = quiz_extended();
    $instance->deactivate();
}