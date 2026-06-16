<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
/* Public endpoint — no session required, but restrict CORS to same origin */
header_remove('Access-Control-Allow-Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require __DIR__ . '/db.php';
require __DIR__ . '/rate_limit.php';

/* IP-based rate limit: max 5 application submissions per hour */
enforceRateLimit($pdo, 'submit_application', 5, 3600);

/* ── Input length limits ── */
const MAX_NAME    = 200;
const MAX_ID      = 50;
const MAX_TEXT    = 500;
const MAX_ADDRESS = 1000;
const MAX_MEDICAL = 2000;

function clean($v, $maxLen = 500) {
    $v = trim((string)$v);
    if (mb_strlen($v) > $maxLen) $v = mb_substr($v, 0, $maxLen);
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

/* ── Required field validation ── */
$learnerName = clean($_POST['learnerName'] ?? '', MAX_NAME);
$dob         = clean($_POST['dob']         ?? '', 10);
$gender      = clean($_POST['gender']      ?? '', 20);
$grade       = clean($_POST['grade']       ?? '', 20);
$guardianName= clean($_POST['guardianName']?? '', MAX_NAME);
$phone       = clean($_POST['phone']       ?? '', 20);
$email       = trim($_POST['email']        ?? '');
$address     = clean($_POST['address']     ?? '', MAX_ADDRESS);
$emergency   = clean($_POST['emergency']   ?? '', 20);

if (!$learnerName || !$dob || !$gender || !$grade || !$guardianName || !$phone || !$email || !$address || !$emergency) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Required fields are missing']);
    exit;
}

/* ── Email validation ── */
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 200) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email address']);
    exit;
}
$email = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');

/* ── Phone basic format ── */
$phoneClean = preg_replace('/[\s\-\(\)\+]/', '', $phone);
if (!ctype_digit($phoneClean) || strlen($phoneClean) < 7 || strlen($phoneClean) > 15) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid phone number']);
    exit;
}

/* ── Grade whitelist ── */
$allowedGrades = ['Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
if (!in_array($grade, $allowedGrades, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid grade selected']);
    exit;
}

/* ── DOB sanity check ── */
$dobParsed = DateTime::createFromFormat('Y-m-d', $dob);
if (!$dobParsed || $dobParsed->format('Y-m-d') !== $dob) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid date of birth']);
    exit;
}

/* ── File upload handler with MIME check ── */
function saveUpload($field) {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return null;

    /* Size check */
    if ($_FILES[$field]['size'] > 5 * 1024 * 1024) return null;

    /* Extension whitelist */
    $ext = strtolower(pathinfo($_FILES[$field]['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['pdf','jpg','jpeg','png'], true)) return null;

    /* MIME type check via finfo */
    $allowedMimes = [
        'pdf'  => 'application/pdf',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
    ];
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $_FILES[$field]['tmp_name']);
        finfo_close($finfo);
        if (!in_array($mime, $allowedMimes, true)) return null;
    }

    /* Sanitise filename — use UUID-style name, discard original */
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    move_uploaded_file($_FILES[$field]['tmp_name'], $uploadDir . $filename);
    return $filename;
}

/* ── Generate secure reference code ── */
function generateRefCode($pdo) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $year  = date('y');
    $attempts = 0;
    do {
        if (++$attempts > 20) throw new RuntimeException('Could not generate unique ref code');
        $suffix = '';
        for ($i = 0; $i < 6; $i++) {
            $suffix .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $code = 'BHS' . $year . '-' . $suffix;
        $chk  = $pdo->prepare("SELECT id FROM applications WHERE ref_code = ?");
        $chk->execute([$code]);
    } while ($chk->fetch());
    return $code;
}

$refCode = generateRefCode($pdo);

$stmt = $pdo->prepare("
    INSERT INTO applications
        (ref_code, learner_name, dob, gender, id_number, language, nationality, grade, prev_school,
         guardian_name, relationship, guardian_id, phone, email, address, occupation, emergency,
         medical, needs, doc_birth, doc_report, doc_proof)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
");

$stmt->execute([
    $refCode,
    $learnerName,
    $dob,
    $gender,
    clean($_POST['idNumber']     ?? '', MAX_ID),
    clean($_POST['language']     ?? '', 100),
    clean($_POST['nationality']  ?? '', 100),
    $grade,
    clean($_POST['prevSchool']   ?? '', MAX_NAME),
    $guardianName,
    clean($_POST['relationship'] ?? '', 50),
    clean($_POST['guardianId']   ?? '', MAX_ID),
    $phone,
    $email,
    $address,
    clean($_POST['occupation']   ?? '', 100),
    $emergency,
    clean($_POST['medical']      ?? '', MAX_MEDICAL),
    clean($_POST['needs']        ?? '', MAX_MEDICAL),
    saveUpload('docBirth'),
    saveUpload('docReport'),
    saveUpload('docProof'),
]);

echo json_encode(['success' => true, 'ref_code' => $refCode]);
