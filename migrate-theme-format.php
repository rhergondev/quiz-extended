<?php
/**
 * Script to clean and migrate theme format in database
 * Access via: http://localhost:8000/wp-content/plugins/quiz-extended/migrate-theme-format.php
 * 
 * IMPORTANT: Delete this file after running!
 */

// Load WordPress
require_once dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php';

// Security check - only allow logged-in admins
if (!is_user_logged_in() || !current_user_can('manage_options')) {
    wp_die('Access denied. You must be logged in as an administrator.');
}

echo "=== Theme Format Migration ===\n\n";

// Get current settings
$settings = get_option('qe_plugin_settings', []);

echo "Current settings:\n";
print_r($settings);
echo "\n";

if (isset($settings['theme'])) {
    $theme = $settings['theme'];

    echo "Current theme structure:\n";
    print_r($theme);
    echo "\n";

    // Check if it has the old format (properties at root level)
    $hasOldFormat = isset($theme['primary']) || isset($theme['secondary']) || isset($theme['accent']);
    $hasNewFormat = isset($theme['light']) && isset($theme['dark']);

    echo "Has old format (root properties): " . ($hasOldFormat ? 'YES' : 'NO') . "\n";
    echo "Has new format (light/dark): " . ($hasNewFormat ? 'YES' : 'NO') . "\n\n";

    if ($hasOldFormat && $hasNewFormat) {
        echo "⚠️  MIXED FORMAT DETECTED! Cleaning...\n\n";

        // Keep only the new format (light/dark)
        $cleanTheme = [
            'light' => $theme['light'],
            'dark' => $theme['dark']
        ];

        echo "Cleaned theme (removing root-level properties):\n";
        print_r($cleanTheme);
        echo "\n";

        // Update settings with clean theme
        $settings['theme'] = $cleanTheme;

        $result = update_option('qe_plugin_settings', $settings);

        if ($result) {
            echo "✅ Theme format cleaned successfully!\n";
            echo "   Removed old root-level properties\n";
            echo "   Kept only light/dark structure\n";
        } else {
            echo "❌ Failed to update settings\n";
        }
    } elseif ($hasNewFormat) {
        echo "✅ Theme format is already clean (light/dark only)\n";
    } else {
        echo "⚠️  Theme needs migration to new format\n";
    }
} else {
    echo "❌ No theme found in settings\n";
}

echo "\n=== Migration Complete ===\n";
