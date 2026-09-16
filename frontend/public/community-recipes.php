<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$dir = __DIR__ . '/data';
$file = $dir . '/community-recipes.json';

function recipes_read($file) {
  if (!is_file($file)) return [];
  $data = json_decode(file_get_contents($file), true);
  return is_array($data['recipes'] ?? null) ? $data['recipes'] : [];
}

function recipes_write($dir, $file, $recipes) {
  if (!is_dir($dir)) mkdir($dir, 0775, true);
  file_put_contents($file, json_encode(['recipes' => $recipes], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  echo json_encode(['recipes' => recipes_read($file)], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false]);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$title = clean_text($input['title'] ?? '', 80);
$authorName = clean_text($input['author']['name'] ?? '', 60);
$image = (string) ($input['image'] ?? '');
if ($title === '' || $authorName === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'invalid']);
  exit;
}
if ($image !== '' && (strpos($image, 'data:image/jpeg') !== 0 || strlen($image) > 900000)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'photo']);
  exit;
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
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'invalid']);
  exit;
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
  'createdAt' => (int) round(microtime(true) * 1000),
];

$existing = array_values(array_filter(recipes_read($file), function ($item) use ($id) {
  return ($item['id'] ?? '') !== $id;
}));
$recipes = array_slice(array_merge([$recipe], $existing), 0, 80);
recipes_write($dir, $file, $recipes);
echo json_encode(['ok' => true, 'recipe' => $recipe], JSON_UNESCAPED_UNICODE);
