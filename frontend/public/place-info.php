<?php
/**
 * SinGluten Life — datos extra de un local (Hostinger).
 * Fuente de este archivo: este proyecto, no Nexo Studio.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$name = isset($_GET['name']) ? $_GET['name'] : '';
$address = isset($_GET['address']) ? $_GET['address'] : '';
$type = isset($_GET['type']) ? $_GET['type'] : '';
$query = trim($name . ' ' . $address);
$ddg = 'https://html.duckduckgo.com/html/?q=' . rawurlencode($query);

function grab($url) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER => ['Accept-Language: es-AR,es;q=0.9'],
  ]);
  $html = curl_exec($ch);
  curl_close($ch);
  return $html ?: '';
}

function clean($html) {
  $text = preg_replace('/<script[\s\S]*?<\/script>/i', ' ', $html);
  $text = preg_replace('/<[^>]+>/', ' ', $text);
  return trim(preg_replace('/\s+/', ' ', html_entity_decode($text, ENT_QUOTES, 'UTF-8')));
}

$search = grab($ddg);
$target = '';
if (preg_match_all('/uddg=([^&"]+)/', $search, $m)) {
  foreach ($m[1] as $raw) {
    $url = urldecode($raw);
    if (preg_match('/helveticaonline|guiaoleo|tripadvisor|paginasamarillas/i', $url)) {
      $target = $url;
      break;
    }
  }
}

$text = $target ? clean(grab($target)) : '';
$rating = null;
$count = null;
if (preg_match('/(\d(?:[.,]\d))\s*\(\s*(\d+)\s*reseñas/i', $text, $m)) {
  $n = (float) str_replace(',', '.', $m[1]);
  $rating = $n > 5 ? round($n / 2, 1) : $n;
  $count = (int) $m[2];
} elseif (preg_match('/(\d(?:[.,]\d))\s*puntos sobre 5/i', $text, $m)) {
  $rating = (float) str_replace(',', '.', $m[1]);
}
if (!$count && preg_match('/(\d+)\s*(?:reseñas|opiniones)/i', $text, $m)) $count = (int) $m[1];

$hours = [];
$days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
foreach ($days as $day) {
  if (preg_match('/' . $day . '\s+(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})*)/i', $text, $m)) {
    $hours[] = ['key' => substr($day, 0, 2), 'day' => $day, 'range' => $m[1]];
  }
}

$reviews = [];
if (preg_match_all('/"([^"]{25,180})"/', $text, $m)) {
  foreach ($m[1] as $line) {
    if (preg_match('/http|javascript|script/i', $line)) continue;
    $reviews[] = ['author' => 'Cliente', 'text' => $line];
    if (count($reviews) >= 6) break;
  }
}

$features = [];
if (preg_match('/para llevar|entrega a domicilio/i', $text)) $features[] = ['label' => 'Para llevar', 'ok' => true];
if (preg_match('/no dispone de espacio para el consumo|no.*consumo en el local/i', $text)) {
  $features[] = ['label' => 'Consumo en el lugar', 'ok' => false];
}

$about = '';
if (preg_match('/Ubicada en.{80,400}/', $text, $m)) $about = $m[0];

echo json_encode([
  'photos' => [],
  'rating' => $rating,
  'reviewCount' => $count,
  'reviews' => $reviews,
  'phone' => '',
  'openLabel' => '',
  'hoursRows' => $hours,
  'features' => $features,
  'address' => $address,
  'summary' => $about ?: trim($name . ' · ' . $type . ' · ' . $address),
  'website' => $target,
  'hoursRaw' => '',
], JSON_UNESCAPED_UNICODE);
