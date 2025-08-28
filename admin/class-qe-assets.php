<?php
/**
 * QE_Assets Class
 *
 * Carga (enqueues) los scripts y estilos necesarios para la aplicación
 * de React en el panel de administración, utilizando el método de @wordpress/scripts.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/admin
 * @author     Your Name <you@example.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Assets
{

    public function __construct()
    {
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function enqueue_assets($hook)
    {
        if ('toplevel_page_quiz-extended-lms' !== $hook && strpos($hook, 'quiz-lms_page_') === false) {
            return;
        }

        $build_path = 'admin/react-app/build/';
        $script_asset_path = QUIZ_EXTENDED_PLUGIN_DIR . $build_path . 'index.asset.php';

        if (!file_exists($script_asset_path)) {
            add_action('admin_notices', function () {
                echo '<div class="notice notice-error"><p><strong>Quiz Extended LMS Error:</strong> No se encontró el archivo <code>index.asset.php</code>. Asegúrate de haber compilado el proyecto ejecutando <code>npm run build</code> en la carpeta <code>admin/react-app</code>.</p></div>';
            });
            return;
        }

        $script_asset = require($script_asset_path);

        wp_enqueue_script(
            'quiz-extended-react-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . 'index.js',
            $script_asset['dependencies'],
            $script_asset['version'],
            true
        );

        wp_enqueue_style(
            'quiz-extended-react-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . 'index.css',
            [],
            $script_asset['version']
        );

        // --- LA LÍNEA CRÍTICA CORREGIDA ---
        // Usamos home_url() y rtrim() para garantizar una URL base limpia sin barra al final.
        $api_url_base = rtrim(home_url('/wp-json'), '/');

        wp_localize_script(
            'quiz-extended-react-app',
            'qe_data',
            [
                'api_url' => $api_url_base, // Pasamos la URL base limpia (ej: http://localhost:8000/wp-json)
                'nonce' => wp_create_nonce('wp_rest'),
            ]
        );
    }
}