<?php
/**
 * Custom page template for the Quiz Extended LMS.
 * This template includes the site header but removes the footer
 * to provide a full-screen app experience.
 *
 * @package QuizExtended
 */

get_header();

// Check if user is logged in
if (!is_user_logged_in()) {
    // Get plugin settings
    $settings = get_option('qe_plugin_settings', []);
    $campus_logo = isset($settings['campus_logo']) ? $settings['campus_logo'] : '';
    $theme_color = isset($settings['theme']) ? $settings['theme'] : '#1a202c';

    // Get redirect URL
    $redirect_to = isset($_REQUEST['redirect_to']) ? $_REQUEST['redirect_to'] : home_url('/academia/');
    ?>

    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>

    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <?php wp_head(); ?>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg,
                        <?php echo esc_attr($theme_color); ?>
                        15 0%,
                        <?php echo esc_attr($theme_color); ?>
                        05 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .qe-login-container {
                width: 100%;
                max-width: 450px;
                padding: 20px;
            }

            .qe-login-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                padding: 48px 40px;
                text-align: center;
            }

            .qe-login-logo {
                margin-bottom: 32px;
            }

            .qe-login-logo img {
                max-width: 200px;
                height: auto;
            }

            .qe-login-logo h1 {
                margin: 0;
                font-size: 32px;
                font-weight: 700;
                color:
                    <?php echo esc_attr($theme_color); ?>
                ;
            }

            .qe-login-title {
                font-size: 24px;
                font-weight: 600;
                color: #1a202c;
                margin: 0 0 8px 0;
            }

            .qe-login-subtitle {
                font-size: 14px;
                color: #6b7280;
                margin: 0 0 32px 0;
            }

            .qe-login-form {
                text-align: left;
            }

            .qe-form-group {
                margin-bottom: 20px;
            }

            .qe-form-label {
                display: block;
                font-size: 14px;
                font-weight: 500;
                color: #374151;
                margin-bottom: 8px;
            }

            .qe-form-input {
                width: 100%;
                padding: 12px 16px;
                font-size: 15px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .qe-form-input:focus {
                outline: none;
                border-color:
                    <?php echo esc_attr($theme_color); ?>
                ;
                box-shadow: 0 0 0 3px
                    <?php echo esc_attr($theme_color); ?>
                    20;
            }

            .qe-form-checkbox-group {
                display: flex;
                align-items: center;
                margin-bottom: 24px;
            }

            .qe-form-checkbox {
                margin-right: 8px;
            }

            .qe-form-checkbox-label {
                font-size: 14px;
                color: #6b7280;
                cursor: pointer;
            }

            .qe-submit-button {
                width: 100%;
                padding: 14px 24px;
                font-size: 16px;
                font-weight: 600;
                color: white;
                background:
                    <?php echo esc_attr($theme_color); ?>
                ;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                margin-bottom: 16px;
            }

            .qe-submit-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 20px
                    <?php echo esc_attr($theme_color); ?>
                    40;
            }

            .qe-submit-button:active {
                transform: translateY(0);
            }

            .qe-login-links {
                text-align: center;
                margin-top: 24px;
            }

            .qe-login-link {
                font-size: 14px;
                color:
                    <?php echo esc_attr($theme_color); ?>
                ;
                text-decoration: none;
                font-weight: 500;
                transition: opacity 0.2s;
            }

            .qe-login-link:hover {
                opacity: 0.8;
                text-decoration: underline;
            }

            .qe-login-divider {
                display: flex;
                align-items: center;
                margin: 24px 0;
            }

            .qe-login-divider::before,
            .qe-login-divider::after {
                content: '';
                flex: 1;
                height: 1px;
                background: #e5e7eb;
            }

            .qe-login-divider span {
                padding: 0 16px;
                font-size: 14px;
                color: #9ca3af;
            }

            .qe-error-message {
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                font-size: 14px;
                color: #c00;
            }
        </style>
    </head>

    <body class="qe-login-page">
        <div class="qe-login-container">
            <div class="qe-login-card">
                <div class="qe-login-logo">
                    <?php if ($campus_logo): ?>
                        <img src="<?php echo esc_url($campus_logo); ?>" alt="Campus Logo">
                    <?php else: ?>
                        <h1>Campus</h1>
                    <?php endif; ?>
                </div>

                <h2 class="qe-login-title">Bienvenido de vuelta</h2>
                <p class="qe-login-subtitle">Inicia sesión para acceder a tu campus virtual</p>

                <?php
                // Show login errors
                if (isset($_GET['login']) && $_GET['login'] == 'failed') {
                    echo '<div class="qe-error-message">Usuario o contraseña incorrectos</div>';
                }
                if (isset($_GET['login']) && $_GET['login'] == 'empty') {
                    echo '<div class="qe-error-message">Por favor, introduce tu usuario y contraseña</div>';
                }
                ?>

                <form name="loginform" id="loginform"
                    action="<?php echo esc_url(site_url('wp-login.php', 'login_post')); ?>" method="post"
                    class="qe-login-form">
                    <div class="qe-form-group">
                        <label for="user_login" class="qe-form-label">Usuario o correo electrónico</label>
                        <input type="text" name="log" id="user_login" class="qe-form-input"
                            value="<?php echo esc_attr(isset($_POST['log']) ? $_POST['log'] : ''); ?>" size="20"
                            autocapitalize="off" required />
                    </div>

                    <div class="qe-form-group">
                        <label for="user_pass" class="qe-form-label">Contraseña</label>
                        <input type="password" name="pwd" id="user_pass" class="qe-form-input" value="" size="20"
                            required />
                    </div>

                    <div class="qe-form-checkbox-group">
                        <input name="rememberme" type="checkbox" id="rememberme" value="forever" class="qe-form-checkbox" />
                        <label for="rememberme" class="qe-form-checkbox-label">Recordarme</label>
                    </div>

                    <input type="hidden" name="redirect_to" value="<?php echo esc_attr($redirect_to); ?>" />
                    <input type="hidden" name="testcookie" value="1" />

                    <button type="submit" name="wp-submit" id="wp-submit" class="qe-submit-button">
                        Iniciar Sesión
                    </button>
                </form>

                <div class="qe-login-links">
                    <a href="<?php echo esc_url(wp_lostpassword_url()); ?>" class="qe-login-link">
                        ¿Olvidaste tu contraseña?
                    </a>
                </div>
            </div>
        </div>
        <?php wp_footer(); ?>
    </body>

    </html>

    <?php
    exit; // Stop execution after showing login page
}
?>

<style>
    /* Reset theme styles that might interfere with the full-screen app */
    html,
    body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        background-color: #f3f4f6;
        /* Fallback color */
    }

    /* Remove margins from common theme containers if they exist in header */
    .site-header,
    #masthead,
    header {
        margin-bottom: 0 !important;
    }

    /* Ensure the app container takes available space */
    #qe-frontend-root {
        width: 100%;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        /* Fallback */
    }
</style>

<!-- Direct output of the React Root, bypassing theme content wrappers -->
<div id="qe-frontend-root" class="qe-lms-app"></div>

<?php
// We call wp_footer() directly to ensure scripts are loaded,
// but we intentionally omit get_footer() to hide the theme's footer.
wp_footer();
?>

</body>

</html>