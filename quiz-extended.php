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
    
    public function on_course_complete($course_id) {
        // Lógica cuando se completa un curso
        error_log('Curso completado: ' . $course_id);
    }
    
    public function on_lesson_complete($lesson_id) {
        // Lógica cuando se completa una lección
        error_log('Lección completada: ' . $lesson_id);
    }
    
    public function modify_course_loop($content, $course_id) {
        // Modificar el contenido del loop de cursos
        return $content;
    }
    
    public function activate() {
        if (!$this->is_tutor_active()) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(__('Este plugin requiere Tutor LMS para funcionar.', 'quiz-extended'));
        }
        
        // Crear/actualizar tablas
        QuizExtended_Database::create_tables();
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        flush_rewrite_rules();
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
    // Lógica de activación
    $instance = quiz_extended();
    $instance->activate();
}

function quiz_extended_deactivate() {
    // Lógica de desactivación
    $instance = quiz_extended();
    $instance->deactivate();
}