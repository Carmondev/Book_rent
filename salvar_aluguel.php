<?php

header('Content-Type: application/json; charset=utf-8');

// aceitar tanto form-data quanto JSON bruto
$input = file_get_contents('php://input');
$data = [];
if ($input) {
    $json = json_decode($input, true);
    if (is_array($json)) $data = $json;
}

// fallback para $_POST quando o cliente enviar form-urlencoded
if (empty($data)) {
    $data = $_POST;
}

$id_livro = isset($data['id_livro']) ? trim($data['id_livro']) : '';
$nome_locatario = isset($data['nome_locatario']) ? trim($data['nome_locatario']) : '';
$contato_locatario = isset($data['contato_locatario']) ? trim($data['contato_locatario']) : '';
$data_inicio = isset($data['data_inicio']) ? trim($data['data_inicio']) : null;
$semanas = isset($data['semanas']) ? (int)$data['semanas'] : 1;
$titulo_livro = isset($data['titulo_livro']) ? trim($data['titulo_livro']) : '';
$preco_semana = isset($data['preco_semana']) ? (float)$data['preco_semana'] : null;

if ($id_livro === '' || $nome_locatario === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Campos obrigatórios: id_livro, nome_locatario']);
    exit;
}

$root = rtrim($_SERVER['DOCUMENT_ROOT'], DIRECTORY_SEPARATOR);
$dir = $root . DIRECTORY_SEPARATOR . 'dados_alugueis';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}
$file = $dir . DIRECTORY_SEPARATOR . 'alugueis.json';

$all = [];
if (file_exists($file)) {
    $txt = file_get_contents($file);
    $all = json_decode($txt, true) ?: [];
}

$entry = [
    'id_livro' => (string)$id_livro,
    'titulo_livro' => $titulo_livro,
    'nome_locatario' => $nome_locatario,
    'contato_locatario' => $contato_locatario,
    'data_inicio' => $data_inicio,
    'semanas' => $semanas,
    'preco_semana' => $preco_semana,
    'criado_em' => date(DATE_ATOM)
];

$all[] = $entry;
file_put_contents($file, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

echo json_encode(['success' => true, 'saved' => $entry]);

?>
