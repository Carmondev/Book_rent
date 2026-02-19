<?php
// send.php - handler para formulário de contato
// - Valida dados
// - Persiste em SQLite (data/messages.sqlite)
// - Tenta enviar email com mail() (opcional)
// Retorna JSON { success: bool, message: string }

header('Content-Type: application/json; charset=utf-8');

// Somente POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Ler e sanitizar entrada
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';

if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Por favor preencha todos os campos obrigatórios.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

// Preparar DB SQLite
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
$dbFile = $dataDir . DIRECTORY_SEPARATOR . 'messages.sqlite';

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Criar tabela se não existir
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    );

    // Inserir mensagem
    $stmt = $pdo->prepare('INSERT INTO messages (name, phone, email, message) VALUES (:name, :phone, :email, :message)');
    $stmt->execute([
        ':name' => $name,
        ':phone' => $phone,
        ':email' => $email,
        ':message' => $message
    ]);

    $saved = true;
} catch (Exception $e) {
    // Erro ao gravar no DB
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar mensagem: ' . $e->getMessage()]);
    exit;
}

// Tentar enviar email (opcional) - ajuste o destinatário abaixo
$to = 'contato@seudominio.com'; // <--- altere para seu email real
$subject = "Mensagem do site: $name";
$body = "Nome: $name\nTelefone: $phone\nEmail: $email\n\nMensagem:\n$message";
$headers = "From: $name <$email>\r\n" .
           "Reply-To: $email\r\n" .
           "Content-Type: text/plain; charset=utf-8\r\n";

$sent = false;
try {
    // mail() pode falhar em ambientes sem SMTP configurado
    $sent = mail($to, $subject, $body, $headers);
} catch (Exception $e) {
    $sent = false;
}

// Resposta combinada: salvamento em DB + estado do envio por email
$messageResp = 'Mensagem salva com sucesso.';
if ($sent) {
    $messageResp .= ' Email enviado com sucesso.';
} else {
    $messageResp .= ' (Não foi possível enviar email — verifique configuração do servidor).';
}

echo json_encode(['success' => true, 'message' => $messageResp]);

?>
