<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

define('SGL_DB', true);

function fail($code, $error, $detail = '') {
  http_response_code($code);
  $payload = ['ok' => false, 'error' => $error];
  if ($detail !== '') $payload['detail'] = $detail;
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

register_shutdown_function(function () {
  $err = error_get_last();
  if (!$err || !in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) return;
  if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'php', 'detail' => $err['message']], JSON_UNESCAPED_UNICODE);
});

function load_config() {
  foreach (['db-config.php', 'db-config.example.php'] as $name) {
    $path = __DIR__ . '/' . $name;
    if (!is_file($path)) continue;
    $config = include $path;
    if (is_array($config)) return $config;
  }
  return [
    'host' => 'localhost',
    'port' => 3306,
    'name' => 'u290440545_Recetas',
    'user' => 'u290440545_leoSingluten',
    'pass' => 'TU_CONTRASEÑA',
  ];
}

function db($config) {
  static $pdo = null;
  if ($pdo) return $pdo;
  $pass = (string) ($config['pass'] ?? '');
  if ($pass === '' || $pass === 'TU_CONTRASEÑA') {
    fail(500, 'db-password', 'Poné la contraseña real en db-config.php y subí ese archivo junto a community-recipes.php');
  }
  $dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $config['host'],
    $config['port'],
    $config['name']
  );
  $pdo = new PDO($dsn, $config['user'], $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function clean_picture($value) {
  $url = trim((string) $value);
  if ($url === '' || stripos($url, 'https://') !== 0 || strlen($url) > 2000) return '';
  return $url;
}

function clean_text($value, $max) {
  $text = trim(preg_replace('/\s+/', ' ', strip_tags((string) $value)));
  return mb_substr($text, 0, $max);
}

function decode_list($value) {
  $data = json_decode((string) $value, true);
  return is_array($data) ? $data : [];
}

function row_to_recipe($row) {
  return [
    'id' => $row['id'],
    'community' => true,
    'title' => $row['title'],
    'summary' => $row['summary'],
    'minutes' => (int) $row['minutes'],
    'servings' => (int) $row['servings'],
    'difficulty' => $row['difficulty'],
    'tags' => decode_list($row['tags']),
    'ingredients' => decode_list($row['ingredients']),
    'steps' => decode_list($row['steps']),
    'image' => $row['image'],
    'sourceName' => $row['source_name'],
    'sourceUrl' => $row['source_url'],
    'author' => [
      'id' => $row['author_id'],
      'name' => $row['author_name'],
      'picture' => $row['author_picture'],
      'provider' => $row['author_provider'],
    ],
    'createdAt' => (int) $row['created_at'],
  ];
}

function recipes_read($pdo) {
  $stmt = $pdo->query('SELECT * FROM community_recipes ORDER BY created_at DESC LIMIT 80');
  $out = [];
  foreach ($stmt as $row) $out[] = row_to_recipe($row);
  return $out;
}

function recipes_find($pdo, $id) {
  $stmt = $pdo->prepare('SELECT * FROM community_recipes WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  return $row ? row_to_recipe($row) : null;
}

function recipe_params($recipe) {
  return [
    $recipe['title'],
    $recipe['summary'],
    $recipe['minutes'],
    $recipe['servings'],
    $recipe['difficulty'],
    json_encode($recipe['tags'], JSON_UNESCAPED_UNICODE),
    json_encode($recipe['ingredients'], JSON_UNESCAPED_UNICODE),
    json_encode($recipe['steps'], JSON_UNESCAPED_UNICODE),
    $recipe['image'],
    $recipe['sourceName'],
    $recipe['sourceUrl'],
    $recipe['author']['id'],
    $recipe['author']['name'],
    $recipe['author']['picture'],
    $recipe['author']['provider'],
    $recipe['createdAt'],
    $recipe['id'],
  ];
}

function recipes_save($pdo, $recipe) {
  $fields = 'title=?, summary=?, minutes=?, servings=?, difficulty=?, tags=?, ingredients=?, steps=?, image=?,
    source_name=?, source_url=?, author_id=?, author_name=?, author_picture=?, author_provider=?, created_at=?';
  if (recipes_find($pdo, $recipe['id'])) {
    $stmt = $pdo->prepare("UPDATE community_recipes SET $fields WHERE id=?");
    $stmt->execute(recipe_params($recipe));
  } else {
    $stmt = $pdo->prepare(
      'INSERT INTO community_recipes (
        title, summary, minutes, servings, difficulty, tags, ingredients, steps, image,
        source_name, source_url, author_id, author_name, author_picture, author_provider, created_at, id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(recipe_params($recipe));
  }
  $pdo->exec('DELETE FROM community_recipes WHERE id NOT IN (
    SELECT id FROM (
      SELECT id FROM community_recipes ORDER BY created_at DESC LIMIT 80
    ) keep_ids
  )');
}

try {
  $pdo = db(load_config());
} catch (Throwable $e) {
  fail(500, 'db', $e->getMessage());
}

try {

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  echo json_encode(['recipes' => recipes_read($pdo)], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  fail(405, 'method');
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$authorId = clean_text($input['author']['id'] ?? '', 80);

if (($input['action'] ?? '') === 'delete') {
  $incoming = (string) ($input['id'] ?? '');
  if (!preg_match('/^c-[a-z0-9]+$/i', $incoming) || $authorId === '') {
    fail(400, 'invalid');
  }
  $prev = recipes_find($pdo, $incoming);
  if ($prev && ($prev['author']['id'] ?? '') !== $authorId) {
    fail(403, 'forbidden');
  }
  $stmt = $pdo->prepare('DELETE FROM community_recipes WHERE id = ?');
  $stmt->execute([$incoming]);
  echo json_encode(['ok' => true, 'deleted' => $incoming, 'found' => (bool) $prev], JSON_UNESCAPED_UNICODE);
  exit;
}

$title = clean_text($input['title'] ?? '', 80);
$authorName = clean_text($input['author']['name'] ?? '', 60);
$image = (string) ($input['image'] ?? '');
if ($title === '' || $authorName === '') {
  fail(400, 'invalid');
}
if ($image !== '' && (strpos($image, 'data:image/jpeg') !== 0 || strlen($image) > 900000)) {
  fail(400, 'photo');
}

$shops = ['dietetica', 'verduleria', 'carniceria', 'almacen'];
$ingredients = [];
foreach (($input['ingredients'] ?? []) as $item) {
  $name = clean_text($item['name'] ?? '', 80);
  if ($name === '') continue;
  $shop = in_array($item['shop'] ?? '', $shops, true) ? $item['shop'] : 'almacen';
  $ingredients[] = ['name' => $name, 'qty' => clean_text($item['qty'] ?? '', 40), 'shop' => $shop];
  if (count($ingredients) >= 20) break;
}
$steps = [];
foreach (($input['steps'] ?? []) as $step) {
  $line = clean_text($step, 400);
  if ($line === '') continue;
  $steps[] = $line;
  if (count($steps) >= 20) break;
}
if (!$ingredients || !$steps) {
  fail(400, 'invalid');
}

$tags = [];
foreach (($input['tags'] ?? []) as $tag) {
  $label = clean_text($tag, 24);
  if ($label === '' || $label === 'Todas' || $label === 'Comunidad') continue;
  $tags[] = $label;
  if (count($tags) >= 4) break;
}

$incoming = (string) ($input['id'] ?? '');
$id = preg_match('/^c-[a-z0-9]+$/i', $incoming)
  ? $incoming
  : ('c-' . base_convert((string) (int) (microtime(true) * 1000), 10, 36));

$prev = recipes_find($pdo, $id);
if ($prev && $authorId !== '' && ($prev['author']['id'] ?? '') !== $authorId) {
  fail(403, 'forbidden');
}

$recipe = [
  'id' => $id,
  'community' => true,
  'title' => $title,
  'summary' => clean_text($input['summary'] ?? '', 220),
  'minutes' => max(5, min(240, (int) ($input['minutes'] ?? 30))),
  'servings' => max(1, min(12, (int) ($input['servings'] ?? 2))),
  'difficulty' => (($input['difficulty'] ?? '') === 'Media') ? 'Media' : 'Fácil',
  'tags' => $tags,
  'ingredients' => $ingredients,
  'steps' => $steps,
  'image' => $image,
  'sourceName' => $authorName,
  'sourceUrl' => '',
  'author' => [
    'id' => clean_text($input['author']['id'] ?? '', 80),
    'name' => $authorName,
    'picture' => clean_picture($input['author']['picture'] ?? ''),
    'provider' => (($input['author']['provider'] ?? '') === 'facebook') ? 'facebook' : 'google',
  ],
  'createdAt' => (int) ($prev['createdAt'] ?? ((int) ($input['createdAt'] ?? 0) ?: (int) round(microtime(true) * 1000))),
];

recipes_save($pdo, $recipe);
echo json_encode(['ok' => true, 'recipe' => $recipe], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  fail(500, 'db', $e->getMessage());
}
