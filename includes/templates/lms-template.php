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
    // Resolve LMS page URL (used as the redirect_to target after login)
    $lms_page_id_for_redirect = get_option('quiz_extended_lms_page_id', 0);
    $lms_page_url = ($lms_page_id_for_redirect > 0)
        ? get_permalink($lms_page_id_for_redirect)
        : home_url('/campus/');

    // Use the WooCommerce "My Account" page if available, fall back to wp-login.php
    $login_base_url = function_exists('wc_get_page_permalink')
        ? wc_get_page_permalink('myaccount')
        : wp_login_url();

    // Build the full login URL with redirect_to so WooCommerce/WP sends the user back to campus
    $login_redirect_url = add_query_arg('redirect_to', urlencode($lms_page_url), $login_base_url);
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="0;url=<?php echo esc_attr($login_redirect_url); ?>">
        <title>Redirigiendo...</title>
        <script>
        (function () {
            // Save the hash fragment before redirecting — the server never sees URL fragments,
            // so we stash it in sessionStorage for PendingHashRestorer to restore after login.
            var hash = window.location.hash;
            if (hash && hash.length > 1 && hash !== '#/' && hash !== '#/login') {
                sessionStorage.setItem('qe_pending_hash', hash);
            }
            window.location.replace('<?php echo esc_js($login_redirect_url); ?>');
        })();
        </script>
    </head>
    <body></body>
    </html>
    <?php
    exit; // Stop execution after redirect
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
