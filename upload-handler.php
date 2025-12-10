<?php
// upload-handler.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ticketId = $_POST['ticketId'] ?? '';
    $userId = $_POST['userId'] ?? '';
    
    if (empty($ticketId) || empty($userId)) {
        echo json_encode(['error' => 'Missing parameters']);
        exit;
    }
    
    $uploadDir = 'uploads/tickets/' . $ticketId . '/';
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'];
    $maxSize = 10 * 1024 * 1024; // 10MB
    
    $file = $_FILES['file'];
    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExt, $allowedTypes)) {
        echo json_encode(['error' => 'Invalid file type']);
        exit;
    }
    
    if ($file['size'] > $maxSize) {
        echo json_encode(['error' => 'File too large']);
        exit;
    }
    
    $fileName = uniqid() . '_' . $file['name'];
    $filePath = $uploadDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        $fileUrl = 'https://' . $_SERVER['HTTP_HOST'] . '/' . $filePath;
        
        echo json_encode([
            'success' => true,
            'url' => $fileUrl,
            'name' => $file['name'],
            'size' => $file['size']
        ]);
    } else {
        echo json_encode(['error' => 'Upload failed']);
    }
} else {
    echo json_encode(['error' => 'Invalid request method']);
}
?>
