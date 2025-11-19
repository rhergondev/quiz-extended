<?php
// Load WordPress environment
require_once('../../../wp-load.php');

// Check permissions
if (!current_user_can('manage_options')) {
    die('Access denied');
}

echo "Updating database tables...\n";

// Force include the class file if not loaded
require_once(plugin_dir_path(__FILE__) . 'includes/class-qe-database.php');

// Run table creation
if (QE_Database::create_tables()) {
    echo "Database tables updated successfully.\n";
} else {
    echo "Failed to update database tables.\n";
}
