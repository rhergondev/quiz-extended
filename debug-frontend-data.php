<?php
/**
 * Debug script to check what data is being sent to frontend
 * Add this to your theme's functions.php temporarily:
 * add_action('wp_footer', function() { include plugin_dir_path(__FILE__) . 'wp-content/plugins/quiz-extended/debug-frontend-data.php'; });
 */

if (is_page(get_option('quiz_extended_lms_page_id'))) {
    ?>
    <script>
        console.log('=== FRONTEND DEBUG ===');
        console.log('window.qe_data:', window.qe_data);

        if (window.qe_data) {
            console.log('Theme data:', window.qe_data.theme);
            console.log('Theme type:', typeof window.qe_data.theme);
            console.log('Has light?', window.qe_data.theme?.light);
            console.log('Has dark?', window.qe_data.theme?.dark);
            console.log('scoreFormat:', window.qe_data.scoreFormat);
            console.log('isDarkMode:', window.qe_data.isDarkMode);
        } else {
            console.error('window.qe_data is undefined!');
        }

        console.log('=== END DEBUG ===');
    </script>
    <?php
}
