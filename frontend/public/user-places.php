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
  $path = __DIR__ . '/db-config.php';
  if (!is_file($path)) fail(500, 'db-config', 'Falta db-config.php junto a user-places.php');
  $config = include $path;
  if (!is_array($config)) fail(500, 'db-config');
  return $config;
}

function db($config) {
  static $pdo = null;
  if ($pdo) return $pdo;
  $pass = (string) ($config['pass'] ?? '');
  if ($pass === '' || $pass === 'TU_CONTRASEÑA') {
    fail(500, 'db-password', 'Poné la contraseña real en db-config.php');
  }
  $dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $config['host'],
    (int) $config['port'],
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
  $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)));
  return mb_substr($text, 0, $max);
}

function clean_block($value, $max) {
  $text = strip_tags((string) $value);
  $text = str_replace(["\r\n", "\r"], "\n", $text);
  $text = preg_replace("/[ \t]+/u", ' ', $text);
  $text = preg_replace("/\n{2,}/u", "\n", $text);
  return mb_substr(trim($text), 0, $max);
}

function row_to_place($row) {
  return [
    'id' => $row['id'],
    'name' => $row['name'],
    'image' => $row['image'],
    'description' => $row['description'],
    'hours' => $row['hours'],
    'menu' => $row['menu'],
    'review' => $row['review'],
    'country' => $row['country'] ?? '',
    'province' => $row['province'] ?? '',
    'neighborhood' => $row['neighborhood'] ?? '',
    'street' => $row['street'] ?? '',
    'streetNumber' => $row['street_number'] ?? '',
    'address' => $row['address'],
    'lat' => (float) $row['lat'],
    'lon' => (float) $row['lon'],
    'author' => [
      'id' => $row['author_id'],
      'name' => $row['author_name'],
      'picture' => $row['author_picture'],
      'provider' => $row['author_provider'],
    ],
    'createdAt' => (int) $row['created_at'],
    'updatedAt' => (int) $row['updated_at'],
    'deletedAt' => $row['deleted_at'] === null ? null : (int) $row['deleted_at'],
    'deleteNote' => $row['delete_note'],
  ];
}

function ensure_place_schema($pdo) {
  $pdo->exec(
    "CREATE TABLE IF NOT EXISTS user_places (
      id VARCHAR(32) NOT NULL,
      name VARCHAR(80) NOT NULL,
      image MEDIUMTEXT NOT NULL,
      description VARCHAR(600) NOT NULL,
      hours VARCHAR(400) NOT NULL,
      menu TEXT NOT NULL,
      review VARCHAR(500) NOT NULL DEFAULT '',
      country VARCHAR(80) NOT NULL DEFAULT '',
      province VARCHAR(80) NOT NULL DEFAULT '',
      neighborhood VARCHAR(80) NOT NULL DEFAULT '',
      street VARCHAR(120) NOT NULL DEFAULT '',
      street_number VARCHAR(20) NOT NULL DEFAULT '',
      address VARCHAR(300) NOT NULL,
      lat DOUBLE NOT NULL,
      lon DOUBLE NOT NULL,
      author_id VARCHAR(80) NOT NULL,
      author_name VARCHAR(60) NOT NULL,
      author_picture VARCHAR(2000) NOT NULL DEFAULT '',
      author_provider VARCHAR(16) NOT NULL DEFAULT 'google',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      deleted_at BIGINT NULL,
      delete_note VARCHAR(400) NOT NULL DEFAULT '',
      PRIMARY KEY (id),
      KEY idx_author (author_id),
      KEY idx_active (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
  );
  $present = [];
  foreach ($pdo->query('SHOW COLUMNS FROM user_places') as $col) $present[$col['Field']] = $col;
  $add = [
    'country' => "VARCHAR(80) NOT NULL DEFAULT ''",
    'province' => "VARCHAR(80) NOT NULL DEFAULT ''",
    'neighborhood' => "VARCHAR(80) NOT NULL DEFAULT ''",
    'street' => "VARCHAR(120) NOT NULL DEFAULT ''",
    'street_number' => "VARCHAR(20) NOT NULL DEFAULT ''",
  ];
  foreach ($add as $name => $def) {
    if (!isset($present[$name])) $pdo->exec("ALTER TABLE user_places ADD COLUMN `$name` $def");
  }
  if (isset($present['address']) && stripos((string) $present['address']['Type'], 'varchar(180)') !== false) {
    $pdo->exec('ALTER TABLE user_places MODIFY address VARCHAR(300) NOT NULL');
  }
}

function places_find($pdo, $id) {
  $stmt = $pdo->prepare('SELECT * FROM user_places WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  return $row ? row_to_place($row) : null;
}

function places_read($pdo, $authorId) {
  if ($authorId !== '') {
    $stmt = $pdo->prepare('SELECT * FROM user_places WHERE author_id = ? ORDER BY updated_at DESC LIMIT 80');
    $stmt->execute([$authorId]);
  } else {
    $stmt = $pdo->query('SELECT * FROM user_places WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 300');
  }
  $out = [];
  foreach ($stmt as $row) $out[] = row_to_place($row);
  return $out;
}

try {
  $pdo = db(load_config());
  ensure_place_schema($pdo);
} catch (Throwable $e) {
  fail(500, 'db', $e->getMessage());
}

try {
  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $authorId = clean_text($_GET['author'] ?? '', 80);
    echo json_encode(['ok' => true, 'places' => places_read($pdo, $authorId)], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'method');

  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $authorId = clean_text($input['author']['id'] ?? '', 80);
  $authorName = clean_text($input['author']['name'] ?? '', 60);
  if ($authorId === '' || $authorName === '') fail(400, 'invalid');

  if (($input['action'] ?? '') === 'delete') {
    $incoming = (string) ($input['id'] ?? '');
    $note = clean_text($input['deleteNote'] ?? '', 400);
    if (!preg_match('/^u-[a-z0-9]+$/i', $incoming) || $note === '') fail(400, 'invalid');
    $prev = places_find($pdo, $incoming);
    if (!$prev) fail(404, 'missing');
    if (($prev['author']['id'] ?? '') !== $authorId) fail(403, 'forbidden');
    if ($prev['deletedAt'] !== null) {
      echo json_encode(['ok' => true, 'place' => $prev], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $now = (int) round(microtime(true) * 1000);
    $stmt = $pdo->prepare('UPDATE user_places SET deleted_at = ?, delete_note = ?, updated_at = ? WHERE id = ?');
    $stmt->execute([$now, $note, $now, $incoming]);
    $saved = places_find($pdo, $incoming);
    echo json_encode(['ok' => true, 'place' => $saved], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $name = clean_text($input['name'] ?? '', 80);
  $description = clean_block($input['description'] ?? '', 600);
  $hours = clean_block($input['hours'] ?? '', 400);
  $menu = clean_block($input['menu'] ?? '', 2000);
  $review = clean_text($input['review'] ?? '', 500);
  $country = clean_text($input['country'] ?? '', 80);
  $province = clean_text($input['province'] ?? '', 80);
  $neighborhood = clean_text($input['neighborhood'] ?? '', 80);
  $street = clean_text($input['street'] ?? '', 120);
  $streetNumber = clean_text($input['streetNumber'] ?? '', 20);
  $address = clean_text($street . ' ' . $streetNumber . ', ' . $neighborhood . ', ' . $province . ', ' . $country, 300);
  $image = (string) ($input['image'] ?? '');
  $lat = isset($input['lat']) ? (float) $input['lat'] : NAN;
  $lon = isset($input['lon']) ? (float) $input['lon'] : NAN;
  if ($name === '' || $description === '' || $hours === '' || $country === '' || $province === '' || $neighborhood === '' || $street === '' || $streetNumber === '') {
    fail(400, 'invalid');
  }
  if ($image === '' || strpos($image, 'data:image/jpeg') !== 0 || strlen($image) > 900000) fail(400, 'photo');
  if (!is_finite($lat) || !is_finite($lon) || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) fail(400, 'map');

  $incoming = (string) ($input['id'] ?? '');
  $id = preg_match('/^u-[a-z0-9]+$/i', $incoming)
    ? $incoming
    : ('u-' . base_convert((string) (int) (microtime(true) * 1000), 10, 36));
  $prev = places_find($pdo, $id);
  if ($prev && ($prev['author']['id'] ?? '') !== $authorId) fail(403, 'forbidden');
  if ($prev && $prev['deletedAt'] !== null) fail(400, 'deleted');

  $now = (int) round(microtime(true) * 1000);
  $place = [
    'id' => $id,
    'name' => $name,
    'image' => $image,
    'description' => $description,
    'hours' => $hours,
    'menu' => $menu,
    'review' => $review,
    'country' => $country,
    'province' => $province,
    'neighborhood' => $neighborhood,
    'street' => $street,
    'streetNumber' => $streetNumber,
    'address' => $address,
    'lat' => $lat,
    'lon' => $lon,
    'author' => [
      'id' => $authorId,
      'name' => $authorName,
      'picture' => clean_picture($input['author']['picture'] ?? ''),
      'provider' => (($input['author']['provider'] ?? '') === 'facebook') ? 'facebook' : 'google',
    ],
    'createdAt' => (int) ($prev['createdAt'] ?? $now),
    'updatedAt' => $now,
    'deletedAt' => null,
    'deleteNote' => '',
  ];

  if ($prev) {
    $stmt = $pdo->prepare(
      'UPDATE user_places SET name=?, image=?, description=?, hours=?, menu=?, review=?, country=?, province=?,
        neighborhood=?, street=?, street_number=?, address=?, lat=?, lon=?,
        author_name=?, author_picture=?, author_provider=?, updated_at=?, deleted_at=NULL, delete_note=? WHERE id=?'
    );
    $stmt->execute([
      $place['name'], $place['image'], $place['description'], $place['hours'], $place['menu'], $place['review'],
      $place['country'], $place['province'], $place['neighborhood'], $place['street'], $place['streetNumber'],
      $place['address'], $place['lat'], $place['lon'], $place['author']['name'], $place['author']['picture'],
      $place['author']['provider'], $place['updatedAt'], '', $place['id'],
    ]);
  } else {
    $stmt = $pdo->prepare(
      'INSERT INTO user_places (
        id, name, image, description, hours, menu, review, country, province, neighborhood, street, street_number,
        address, lat, lon, author_id, author_name, author_picture, author_provider, created_at, updated_at, deleted_at, delete_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)'
    );
    $stmt->execute([
      $place['id'], $place['name'], $place['image'], $place['description'], $place['hours'], $place['menu'],
      $place['review'], $place['country'], $place['province'], $place['neighborhood'], $place['street'],
      $place['streetNumber'], $place['address'], $place['lat'], $place['lon'], $place['author']['id'],
      $place['author']['name'], $place['author']['picture'], $place['author']['provider'],
      $place['createdAt'], $place['updatedAt'], '',
    ]);
  }

  echo json_encode(['ok' => true, 'place' => $place], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  fail(500, 'db', $e->getMessage());
}
