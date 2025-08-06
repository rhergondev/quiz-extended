<?php
if (!defined('ABSPATH')) {
    exit;
}

class QuizExtended_Admin {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    public function add_admin_menu() {
        add_submenu_page(
            'tutor',
            __('Quiz Extended', 'quiz-extended'),
            __('Quiz Extended', 'quiz-extended'),
            'manage_tutor',
            'quiz-extended',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Quiz Extended', 'quiz-extended'); ?></h1>
            <p><?php _e('Configuración de tu extensión para Tutor LMS', 'quiz-extended'); ?></p>
        </div>
        <?php
    }
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'quiz-extended') !== false) {
            wp_enqueue_style('quiz-extended-admin', QUIZ_EXTENDED_URL . 'assets/css/admin.css', array(), QUIZ_EXTENDED_VERSION);
            wp_enqueue_script('quiz-extended-admin', QUIZ_EXTENDED_URL . 'assets/js/admin.js', array('jquery'), QUIZ_EXTENDED_VERSION, true);
        }
    }
}