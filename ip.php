<?php
// Hound v1.0 — IP Logger
// Captures IP, User-Agent with timestamp and rate limiting

$ip = '';
if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
    $ip = $_SERVER['HTTP_CLIENT_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
} else {
    $ip = $_SERVER['REMOTE_ADDR'];
}

$browser = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'Unknown';
$timestamp = date('Y-m-d H:i:s');

// Simple rate limit — 1 log per IP per 5 seconds
$ratefile = sys_get_temp_dir() . '/hound_rate_' . md5($ip);
if (file_exists($ratefile) && (time() - filemtime($ratefile)) < 5) {
    exit;
}
touch($ratefile);

// Log to ip.txt (for terminal detection)
$entry = "IP: {$ip}\n";
file_put_contents('ip.txt', $entry);

// Log to saved.ip.txt (persistent)
$full = "[{$timestamp}] IP: {$ip} | UA: {$browser}\n";
file_put_contents('saved.ip.txt', $full, FILE_APPEND);
?>
