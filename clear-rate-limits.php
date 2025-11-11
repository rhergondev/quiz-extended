<?php
/**
 * Clear Rate Limits and Blacklist
 * 
 * Run this file directly to clear all rate limit data and remove IP from blacklist
 * URL: http://localhost:8000/wp-content/plugins/quiz-extended/clear-rate-limits.php
 */

// Load WordPress
require_once('../../../../../wp-load.php');

if (!current_user_can('manage_options')) {
    wp_die('Unauthorized access');
}

global $wpdb;

// 1. Delete all rate limit transients
$deleted_transients = $wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_rate_limit_%' 
     OR option_name LIKE '_transient_timeout_qe_rate_limit_%'"
);

// 2. Delete all violation counters
$deleted_violations = $wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_rate_limit_violations_%' 
     OR option_name LIKE '_transient_timeout_qe_rate_limit_violations_%'"
);

// 3. Clear blacklist
delete_option('qe_rate_limit_blacklist');

// 4. Clear whitelist (optional - comment out if you want to keep it)
// delete_option('qe_rate_limit_whitelist');

// 5. Get client IP and add to whitelist
$client_ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$whitelist = get_option('qe_rate_limit_whitelist', []);
if (!in_array($client_ip, $whitelist)) {
    $whitelist[] = $client_ip;
    update_option('qe_rate_limit_whitelist', $whitelist);
}

?>
<!DOCTYPE html>
<html>

<head>
    <title>Rate Limits Cleared</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #2ecc71;
            margin-top: 0;
        }

        .info {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }

        .stat {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 3px solid #3498db;
        }

        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-top: 5px;
        }

        .actions {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-right: 10px;
        }

        .btn:hover {
            background: #2980b9;
        }

        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>✅ Rate Limits Cleared Successfully</h1>

        <div class="info">
            <strong>Your IP:</strong> <code><?php echo esc_html($client_ip); ?></code>
            <br><br>
            This IP has been added to the whitelist and will bypass rate limiting.
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-label">Transients Deleted</div>
                <div class="stat-value"><?php echo $deleted_transients; ?></div>
            </div>
            <div class="stat">
                <div class="stat-label">Violations Cleared</div>
                <div class="stat-value"><?php echo $deleted_violations; ?></div>
            </div>
            <div class="stat">
                <div class="stat-label">Blacklist</div>
                <div class="stat-value">Cleared</div>
            </div>
            <div class="stat">
                <div class="stat-label">Whitelist IPs</div>
                <div class="stat-value"><?php echo count($whitelist); ?></div>
            </div>
        </div>

        <h3>Updated Rate Limits:</h3>
        <ul>
            <li><strong>General API:</strong> 1000 requests/minute (increased from 300)</li>
            <li><strong>Quiz Start:</strong> 100 requests/5min (increased from 50)</li>
            <li><strong>Quiz Submit:</strong> 100 requests/hour (increased from 40)</li>
            <li><strong>Create:</strong> 100 requests/5min (increased from 30)</li>
            <li><strong>Delete:</strong> 50 requests/5min (increased from 20)</li>
            <li><strong>AJAX Search:</strong> 100 requests/minute (increased from 30)</li>
        </ul>

        <h3>Bypasses Added:</h3>
        <ul>
            <li>✅ Administrators bypass rate limiting (both admin and frontend)</li>
            <li>✅ Localhost IPs (127.0.0.1, ::1, 192.168.x.x, 10.x.x.x)</li>
            <li>✅ Development environments (WP_DEBUG + WP_ENVIRONMENT_TYPE=local)</li>
            <li>✅ Violation threshold increased from 10 to 50</li>
        </ul>

        <div class="actions">
            <a href="<?php echo admin_url(); ?>" class="btn">Go to Admin Dashboard</a>
            <a href="<?php echo home_url('/courses'); ?>" class="btn">Go to Courses</a>
        </div>
    </div>
</body>

</html>