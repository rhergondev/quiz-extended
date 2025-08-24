<?php
/**
 * QE_Assets Class
 *
 * Carga (enqueues) los scripts y estilos necesarios para la aplicación
 * de React en el panel de administración.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/admin
 * @author     Tu Nombre <tu@email.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Assets
{

    /**
     * Constructor.
     *
     * Engancha el método de carga de assets a la acción 'admin_enqueue_scripts'.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    /**
     * Carga los scripts y estilos.
     *
     * @param string $hook El sufijo del hook de la página actual.
     * @since 1.0.0
     */
    public function enqueue_assets($hook)
    {
        // El hook de nuestra página principal es 'toplevel_page_quiz-extended-lms'.
        // Si no estamos en esa página, no cargamos nada.
        if ('toplevel_page_quiz-extended-lms' !== $hook) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | SECCIÓN DE REACT DESACTIVADA TEMPORALMENTE
        |--------------------------------------------------------------------------
        |
        | El siguiente bloque ha sido comentado para evitar el error de "archivos
        | no encontrados" mientras se prueba el backend. Para reactivar la carga
        | de la aplicación de React, simplemente descomenta este bloque.
        |
        */

        /*
        // --- CONFIGURACIÓN ---
        $build_path = 'admin/react-app/build/';
        $asset_manifest_path = QUIZ_EXTENDED_PLUGIN_DIR . $build_path . 'asset-manifest.json';

        if (!file_exists($asset_manifest_path)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p><strong>Quiz Extended LMS Error:</strong> No se encontraron los archivos de la aplicación React. Asegúrate de haber compilado el proyecto (ej: npm run build).</p></div>';
            });
            return;
        }

        $asset_manifest = json_decode(file_get_contents($asset_manifest_path), true);
        $main_js = $asset_manifest['files']['main.js'];
        $main_css = $asset_manifest['files']['main.css'];

        // Cargar el archivo CSS de la aplicación React.
        wp_enqueue_style(
            'quiz-extended-react-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . $main_css,
            [],
            QUIZ_EXTENDED_VERSION
        );

        // Cargar el archivo JavaScript principal de la aplicación React.
        wp_enqueue_script(
            'quiz-extended-react-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . $main_js,
            ['wp-element'],
            QUIZ_EXTENDED_VERSION,
            true
        );

        // Pasar datos de PHP a JavaScript.
        wp_localize_script(
            'quiz-extended-react-app',
            'qe_data',
            [
                'api_url' => esc_url_raw(rest_url($this->get_api_namespace())),
                'nonce'   => wp_create_nonce('wp_rest'),
            ]
        );
        */
    }

    /**
     * Devuelve el namespace de la API para usarlo en wp_localize_script.
     * @return string
     */
    private function get_api_namespace()
    {
        return 'quiz-extended/v1';
    }
}