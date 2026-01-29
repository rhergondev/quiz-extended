<?php
/**
 * Debug script to check actual difficulty values in database
 */

// Load WordPress
require_once(__DIR__ . '/../../../wp-load.php');

global $wpdb;

// Get all questions with their difficulty values
$results = $wpdb->get_results("
    SELECT p.ID, p.post_title, pm.meta_value as difficulty
    FROM {$wpdb->posts} p
    LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_difficulty_level'
    WHERE p.post_type = 'qe_question'
    AND p.post_status = 'publish'
    ORDER BY pm.meta_value, p.ID
    LIMIT 50
");

echo "<h2>Difficulty Values in Database</h2>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><th>ID</th><th>Title</th><th>Difficulty Value</th></tr>";

$difficulty_counts = [];

foreach ($results as $row) {
    $diff = $row->difficulty ?: 'NULL';
    if (!isset($difficulty_counts[$diff])) {
        $difficulty_counts[$diff] = 0;
    }
    $difficulty_counts[$diff]++;

    echo "<tr>";
    echo "<td>{$row->ID}</td>";
    echo "<td>" . esc_html($row->post_title) . "</td>";
    echo "<td><strong>{$diff}</strong></td>";
    echo "</tr>";
}

echo "</table>";

echo "<h3>Difficulty Value Counts:</h3>";
echo "<ul>";
foreach ($difficulty_counts as $diff => $count) {
    echo "<li><strong>{$diff}</strong>: {$count} questions</li>";
}
echo "</ul>";
