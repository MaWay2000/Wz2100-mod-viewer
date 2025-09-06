<?php
// upload_mod.php — saves any uploaded file to ./downloads and returns JSON.
// Place this at /wz4/upload_mod.php (same level as index.php).

header('Content-Type: application/json; charset=utf-8');

// Allow only POST with multipart
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES)) {
  http_response_code(400);
  echo json_encode(['ok'=>false, 'error'=>'No file uploaded']);
  exit;
}

// Ensure /downloads exists and is writable
$targetDir = __DIR__ . DIRECTORY_SEPARATOR . 'downloads';
if (!is_dir($targetDir)) {
  @mkdir($targetDir, 0755, true);
}
if (!is_dir($targetDir) || !is_writable($targetDir)) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'error'=>'Server downloads folder is not writable', 'dir'=>$targetDir]);
  exit;
}

// Take the first file in $_FILES regardless of field name
$info = reset($_FILES);
if (is_array($info) && isset($info['tmp_name'])) {
  $tmpPath = $info['tmp_name'];
  $origName = isset($info['name']) ? $info['name'] : 'upload.bin';
} else {
  http_response_code(400);
  echo json_encode(['ok'=>false, 'error'=>'Invalid upload payload']);
  exit;
}

// Sanitize filename (keep letters, numbers, dot, dash, underscore)
$sanitized = preg_replace('/[^A-Za-z0-9._-]/', '_', $origName);
if (!$sanitized) $sanitized = 'file.bin';

// Compute hash to avoid collisions
$hash = @hash_file('sha1', $tmpPath);
if (!$hash) { $hash = bin2hex(random_bytes(10)); }

// Preserve extension if any
$ext = '';
$dot = strrpos($sanitized, '.');
if ($dot !== false) { $ext = substr($sanitized, $dot); }

// Final filename: <hash>_<basename-without-ext><ext>
$baseNoExt = $dot !== false ? substr($sanitized, 0, $dot) : $sanitized;
$finalName = $hash . '_' . $baseNoExt . $ext;
$destPath = $targetDir . DIRECTORY_SEPARATOR . $finalName;

if (!@move_uploaded_file($tmpPath, $destPath)) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'error'=>'Failed to store file on server']);
  exit;
}

// Build public URL relative to this script
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$url = $scheme . '://' . $host . $base . '/downloads/' . rawurlencode($finalName);

echo json_encode([
  'ok' => true,
  'name' => $sanitized,
  'hash' => $hash,
  'filename' => $finalName,
  'url' => $url,
  'relpath' => 'downloads/' . $finalName,
]);
