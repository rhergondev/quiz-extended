<?php
if (!defined('ABSPATH')) {
    exit;
}

class QuizExtended_Admin {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_qe_update_question_difficulty', array($this, 'ajax_update_question_difficulty'));
        add_action('wp_ajax_qe_bulk_update_difficulty', array($this, 'ajax_bulk_update_difficulty'));
        add_action('wp_ajax_qe_get_quiz_questions', array($this, 'ajax_get_quiz_questions'));
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
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'quiz-extended') !== false) {
            wp_enqueue_style('quiz-extended-admin', QUIZ_EXTENDED_URL . 'assets/css/admin.css', array(), QUIZ_EXTENDED_VERSION);
            wp_enqueue_script('quiz-extended-admin', QUIZ_EXTENDED_URL . 'assets/js/admin.js', array('jquery'), QUIZ_EXTENDED_VERSION, true);
            
            wp_localize_script('quiz-extended-admin', 'qe_ajax', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('quiz_extended_nonce'),
                'strings' => array(
                    'updating' => __('Actualizando...', 'quiz-extended'),
                    'updated' => __('Actualizado correctamente', 'quiz-extended'),
                    'error' => __('Error al actualizar', 'quiz-extended'),
                    'loading' => __('Cargando...', 'quiz-extended'),
                    'confirm_bulk' => __('¿Estás seguro de que quieres aplicar esta actualización masiva?', 'quiz-extended'),
                )
            ));
        }
    }
    
    public function admin_page() {
        $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'difficulty';
        ?>
        <div class="wrap">
            <h1><?php _e('Quiz Extended - Configuración Avanzada', 'quiz-extended'); ?></h1>
            
            <nav class="nav-tab-wrapper">
                <a href="?page=quiz-extended&tab=difficulty" 
                   class="nav-tab <?php echo $active_tab == 'difficulty' ? 'nav-tab-active' : ''; ?>">
                    <span class="dashicons dashicons-editor-help"></span>
                    <?php _e('Dificultad de Preguntas', 'quiz-extended'); ?>
                </a>
                <a href="?page=quiz-extended&tab=stats" 
                   class="nav-tab <?php echo $active_tab == 'stats' ? 'nav-tab-active' : ''; ?>">
                    <span class="dashicons dashicons-chart-bar"></span>
                    <?php _e('Estadísticas', 'quiz-extended'); ?>
                </a>
                <a href="?page=quiz-extended&tab=bulk" 
                   class="nav-tab <?php echo $active_tab == 'bulk' ? 'nav-tab-active' : ''; ?>">
                    <span class="dashicons dashicons-update"></span>
                    <?php _e('Actualización Masiva', 'quiz-extended'); ?>
                </a>
                <a href="?page=quiz-extended&tab=settings" 
                   class="nav-tab <?php echo $active_tab == 'settings' ? 'nav-tab-active' : ''; ?>">
                    <span class="dashicons dashicons-admin-settings"></span>
                    <?php _e('Configuración', 'quiz-extended'); ?>
                </a>
            </nav>
            
            <div class="tab-content">
                <?php
                switch ($active_tab) {
                    case 'stats':
                        $this->render_stats_tab();
                        break;
                    case 'bulk':
                        $this->render_bulk_tab();
                        break;
                    case 'settings':
                        $this->render_settings_tab();
                        break;
                    default:
                        $this->render_difficulty_tab();
                        break;
                }
                ?>
            </div>
        </div>
        <?php
    }
    
    private function render_difficulty_tab() {
        global $wpdb;
        
        // Obtener todos los quizzes
        $quizzes = $wpdb->get_results(
            "SELECT ID, post_title FROM {$wpdb->posts} 
             WHERE post_type = 'tutor_quiz' AND post_status = 'publish' 
             ORDER BY post_title ASC"
        );
        ?>
        
        <div class="qe-tab-content">
            <h2><?php _e('Gestión de Dificultad de Preguntas', 'quiz-extended'); ?></h2>
            <p class="description">
                <?php _e('Selecciona un quiz para gestionar la dificultad de sus preguntas individualmente.', 'quiz-extended'); ?>
            </p>
            
            <div class="qe-quiz-selector">
                <label for="quiz-selector"><?php _e('Seleccionar Quiz:', 'quiz-extended'); ?></label>
                <select id="quiz-selector" name="quiz_id">
                    <option value="0"><?php _e('-- Seleccionar Quiz --', 'quiz-extended'); ?></option>
                    <?php foreach ($quizzes as $quiz): ?>
                        <option value="<?php echo $quiz->ID; ?>">
                            <?php echo esc_html($quiz->post_title); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <button type="button" id="load-quiz-questions" class="button">
                    <?php _e('Cargar Preguntas', 'quiz-extended'); ?>
                </button>
            </div>
            
            <div id="questions-container" style="display: none;">
                <h3><?php _e('Preguntas del Quiz', 'quiz-extended'); ?></h3>
                
                <div class="qe-bulk-actions">
                    <select id="bulk-difficulty-select">
                        <option value=""><?php _e('Cambiar dificultad seleccionadas a...', 'quiz-extended'); ?></option>
                        <option value="easy"><?php _e('Fácil', 'quiz-extended'); ?></option>
                        <option value="medium"><?php _e('Medio', 'quiz-extended'); ?></option>
                        <option value="hard"><?php _e('Difícil', 'quiz-extended'); ?></option>
                    </select>
                    <button type="button" id="apply-bulk-difficulty" class="button">
                        <?php _e('Aplicar', 'quiz-extended'); ?>
                    </button>
                </div>
                
                <table class="wp-list-table widefat fixed striped" id="questions-table">
                    <thead>
                        <tr>
                            <td class="check-column">
                                <input type="checkbox" id="select-all-questions">
                            </td>
                            <th><?php _e('Pregunta', 'quiz-extended'); ?></th>
                            <th><?php _e('Tipo', 'quiz-extended'); ?></th>
                            <th><?php _e('Puntos', 'quiz-extended'); ?></th>
                            <th><?php _e('Dificultad', 'quiz-extended'); ?></th>
                            <th><?php _e('Acciones', 'quiz-extended'); ?></th>
                        </tr>
                    </thead>
                    <tbody id="questions-tbody">
                        <!-- Las preguntas se cargan via AJAX -->
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }
    
    private function render_stats_tab() {
        $stats = QuizExtended_Database::get_difficulty_stats();
        ?>
        <div class="qe-tab-content">
            <h2><?php _e('Estadísticas de Dificultad', 'quiz-extended'); ?></h2>
            
            <?php if (empty($stats)): ?>
                <div class="notice notice-info">
                    <p><?php _e('No hay estadísticas disponibles. Las estadísticas se generarán cuando los usuarios respondan preguntas.', 'quiz-extended'); ?></p>
                </div>
            <?php else: ?>
                <div class="qe-stats-grid">
                    <?php foreach ($stats as $stat): ?>
                        <?php
                        $difficulty_labels = array(
                            'easy' => __('Fácil', 'quiz-extended'),
                            'medium' => __('Medio', 'quiz-extended'),
                            'hard' => __('Difícil', 'quiz-extended')
                        );
                        $label = $difficulty_labels[$stat->question_difficulty] ?? $stat->question_difficulty;
                        ?>
                        
                        <div class="qe-stat-card difficulty-<?php echo esc_attr($stat->question_difficulty); ?>">
                            <h3><?php echo esc_html($label); ?></h3>
                            <div class="stat-number"><?php echo intval($stat->total_questions); ?></div>
                            <div class="stat-label"><?php _e('Preguntas', 'quiz-extended'); ?></div>
                            
                            <div class="stat-details">
                                <div class="stat-item">
                                    <span class="stat-value"><?php echo number_format(floatval($stat->success_rate), 1); ?>%</span>
                                    <span class="stat-desc"><?php _e('Tasa de éxito', 'quiz-extended'); ?></span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value"><?php echo number_format(intval($stat->total_attempts)); ?></span>
                                    <span class="stat-desc"><?php _e('Intentos totales', 'quiz-extended'); ?></span>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
    
    private function render_bulk_tab() {
        ?>
        <div class="qe-tab-content">
            <h2><?php _e('Actualización Masiva de Dificultad', 'quiz-extended'); ?></h2>
            
            <div class="qe-bulk-options">
                <form id="bulk-update-form">
                    <?php wp_nonce_field('quiz_extended_nonce', 'nonce'); ?>
                    
                    <h3><?php _e('Opciones de Actualización', 'quiz-extended'); ?></h3>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Método de Asignación:', 'quiz-extended'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="radio" name="update_method" value="auto" checked>
                                        <?php _e('Asignación automática basada en puntuación', 'quiz-extended'); ?>
                                    </label>
                                    <p class="description">
                                        <?php _e('Fácil: 1-3 puntos, Medio: 4-7 puntos, Difícil: 8+ puntos', 'quiz-extended'); ?>
                                    </p>
                                    
                                    <label>
                                        <input type="radio" name="update_method" value="manual">
                                        <?php _e('Asignar dificultad específica a todas las preguntas', 'quiz-extended'); ?>
                                    </label>
                                </fieldset>
                            </td>
                        </tr>
                        <tr id="manual-difficulty-row" style="display: none;">
                            <th scope="row"><?php _e('Dificultad:', 'quiz-extended'); ?></th>
                            <td>
                                <select name="bulk_difficulty">
                                    <option value="easy"><?php _e('Fácil', 'quiz-extended'); ?></option>
                                    <option value="medium" selected><?php _e('Medio', 'quiz-extended'); ?></option>
                                    <option value="hard"><?php _e('Difícil', 'quiz-extended'); ?></option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Ámbito:', 'quiz-extended'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="radio" name="update_scope" value="all" checked>
                                        <?php _e('Todas las preguntas de todos los quizzes', 'quiz-extended'); ?>
                                    </label>
                                    
                                    <label>
                                        <input type="radio" name="update_scope" value="unassigned">
                                        <?php _e('Solo preguntas sin dificultad asignada', 'quiz-extended'); ?>
                                    </label>
                                </fieldset>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button-primary" id="bulk-update-btn">
                            <?php _e('Aplicar Actualización Masiva', 'quiz-extended'); ?>
                        </button>
                    </p>
                </form>
            </div>
            
            <div id="bulk-update-results" style="display: none;"></div>
        </div>
        <?php
    }
    
    private function render_settings_tab() {
        // Guardar configuración si se ha enviado
        if (isset($_POST['save_settings'])) {
            check_admin_referer('quiz_extended_settings');
            
            $settings = array(
                'show_difficulty_frontend' => isset($_POST['show_difficulty_frontend']),
                'difficulty_colors' => array(
                    'easy' => sanitize_hex_color($_POST['easy_color']),
                    'medium' => sanitize_hex_color($_POST['medium_color']),
                    'hard' => sanitize_hex_color($_POST['hard_color'])
                ),
                'auto_track_performance' => isset($_POST['auto_track_performance']),
            );
            
            QuizExtended_Database::set_config('general_settings', $settings);
            
            echo '<div class="notice notice-success"><p>' . __('Configuración guardada correctamente.', 'quiz-extended') . '</p></div>';
        }
        
        $settings = QuizExtended_Database::get_config('general_settings', array(
            'show_difficulty_frontend' => true,
            'difficulty_colors' => array(
                'easy' => '#28a745',
                'medium' => '#ffc107',
                'hard' => '#dc3545'
            ),
            'auto_track_performance' => true,
        ));
        ?>
        
        <div class="qe-tab-content">
            <h2><?php _e('Configuración General', 'quiz-extended'); ?></h2>
            
            <form method="post" action="">
                <?php wp_nonce_field('quiz_extended_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Mostrar dificultad en frontend', 'quiz-extended'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="show_difficulty_frontend" value="1" 
                                       <?php checked($settings['show_difficulty_frontend']); ?>>
                                <?php _e('Mostrar indicador de dificultad en las preguntas', 'quiz-extended'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('Colores de dificultad', 'quiz-extended'); ?></th>
                        <td>
                            <p>
                                <label><?php _e('Fácil:', 'quiz-extended'); ?></label>
                                <input type="color" name="easy_color" value="<?php echo esc_attr($settings['difficulty_colors']['easy']); ?>">
                            </p>
                            <p>
                                <label><?php _e('Medio:', 'quiz-extended'); ?></label>
                                <input type="color" name="medium_color" value="<?php echo esc_attr($settings['difficulty_colors']['medium']); ?>">
                            </p>
                            <p>
                                <label><?php _e('Difícil:', 'quiz-extended'); ?></label>
                                <input type="color" name="hard_color" value="<?php echo esc_attr($settings['difficulty_colors']['hard']); ?>">
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('Seguimiento automático', 'quiz-extended'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="auto_track_performance" value="1" 
                                       <?php checked($settings['auto_track_performance']); ?>>
                                <?php _e('Registrar automáticamente el rendimiento de las preguntas', 'quiz-extended'); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="save_settings" class="button-primary" 
                           value="<?php esc_attr_e('Guardar Configuración', 'quiz-extended'); ?>">
                </p>
            </form>
        </div>
        <?php
    }
    
    public function ajax_get_quiz_questions() {
        check_ajax_referer('quiz_extended_nonce', 'nonce');
        
        if (!current_user_can('manage_tutor')) {
            wp_send_json_error(array('message' => __('Sin permisos suficientes', 'quiz-extended')));
        }
        
        $quiz_id = intval($_POST['quiz_id']);
        if (!$quiz_id) {
            wp_send_json_error(array('message' => __('ID de quiz inválido', 'quiz-extended')));
        }
        
        $questions = QuizExtended_Database::get_questions_by_difficulty($quiz_id);
        
        $html = '';
        foreach ($questions as $question) {
            $difficulty_labels = array(
                'easy' => __('Fácil', 'quiz-extended'),
                'medium' => __('Medio', 'quiz-extended'),
                'hard' => __('Difícil', 'quiz-extended')
            );
            
            $html .= sprintf(
                '<tr data-question-id="%d">
                    <th class="check-column">
                        <input type="checkbox" name="selected_questions[]" value="%d" class="question-checkbox">
                    </th>
                    <td><strong>%s</strong></td>
                    <td>%s</td>
                    <td>%s</td>
                    <td>
                        <select class="difficulty-select" data-question-id="%d">
                            <option value="easy" %s>%s</option>
                            <option value="medium" %s>%s</option>
                            <option value="hard" %s>%s</option>
                        </select>
                    </td>
                    <td>
                        <button type="button" class="button update-difficulty" data-question-id="%d">
                            %s
                        </button>
                    </td>
                </tr>',
                $question->question_id,
                $question->question_id,
                esc_html(wp_trim_words($question->question_title, 10)),
                esc_html($question->question_type),
                esc_html($question->question_mark),
                $question->question_id,
                selected($question->question_difficulty, 'easy', false),
                $difficulty_labels['easy'],
                selected($question->question_difficulty, 'medium', false),
                $difficulty_labels['medium'],
                selected($question->question_difficulty, 'hard', false),
                $difficulty_labels['hard'],
                $question->question_id,
                __('Actualizar', 'quiz-extended')
            );
        }
        
        wp_send_json_success(array('html' => $html));
    }
    
    public function ajax_update_question_difficulty() {
        check_ajax_referer('quiz_extended_nonce', 'nonce');
        
        if (!current_user_can('manage_tutor')) {
            wp_send_json_error(array('message' => __('Sin permisos suficientes', 'quiz-extended')));
        }
        
        $question_id = intval($_POST['question_id']);
        $difficulty = sanitize_text_field($_POST['difficulty']);
        
        $result = QuizExtended_Database::update_question_difficulty($question_id, $difficulty);
        
        if ($result !== false) {
            wp_send_json_success(array(
                'message' => __('Dificultad actualizada correctamente', 'quiz-extended')
            ));
        } else {
            wp_send_json_error(array(
                'message' => __('Error al actualizar la dificultad', 'quiz-extended')
            ));
        }
    }
    
    public function ajax_bulk_update_difficulty() {
        check_ajax_referer('quiz_extended_nonce', 'nonce');
        
        if (!current_user_can('manage_tutor')) {
            wp_send_json_error(array('message' => __('Sin permisos suficientes', 'quiz-extended')));
        }
        
        global $wpdb;
        
        $update_method = sanitize_text_field($_POST['update_method']);
        $update_scope = sanitize_text_field($_POST['update_scope']);
        $bulk_difficulty = sanitize_text_field($_POST['bulk_difficulty']);
        
        $updated_count = 0;
        
        if ($update_method === 'auto') {
            // Actualización automática basada en puntuación
            $queries = array(
                "UPDATE {$wpdb->prefix}tutor_quiz_questions 
                 SET question_difficulty = 'easy' 
                 WHERE question_mark >= 1 AND question_mark <= 3" . 
                 ($update_scope === 'unassigned' ? " AND (question_difficulty IS NULL OR question_difficulty = '')" : ""),
                 
                "UPDATE {$wpdb->prefix}tutor_quiz_questions 
                 SET question_difficulty = 'medium' 
                 WHERE question_mark >= 4 AND question_mark <= 7" . 
                 ($update_scope === 'unassigned' ? " AND (question_difficulty IS NULL OR question_difficulty = '')" : ""),
                 
                "UPDATE {$wpdb->prefix}tutor_quiz_questions 
                 SET question_difficulty = 'hard' 
                 WHERE question_mark >= 8" . 
                 ($update_scope === 'unassigned' ? " AND (question_difficulty IS NULL OR question_difficulty = '')" : "")
            );
            
            foreach ($queries as $query) {
                $result = $wpdb->query($query);
                $updated_count += $result;
            }
            
        } elseif ($update_method === 'manual' && $bulk_difficulty && in_array($bulk_difficulty, array('easy', 'medium', 'hard'))) {
            // Actualización manual a dificultad específica
            $query = "UPDATE {$wpdb->prefix}tutor_quiz_questions SET question_difficulty = %s";
            
            if ($update_scope === 'unassigned') {
                $query .= " WHERE question_difficulty IS NULL OR question_difficulty = ''";
                $updated_count = $wpdb->query($wpdb->prepare($query, $bulk_difficulty));
            } else {
                $updated_count = $wpdb->query($wpdb->prepare($query, $bulk_difficulty));
            }
        }
        
        if ($updated_count > 0) {
            wp_send_json_success(array(
                'message' => sprintf(__('Se actualizaron %d preguntas correctamente', 'quiz-extended'), $updated_count)
            ));
        } else {
            wp_send_json_success(array(
                'message' => __('No se actualizó ninguna pregunta (posiblemente ya tenían la dificultad asignada)', 'quiz-extended')
            ));
        }
    }
}