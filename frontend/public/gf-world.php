<?php
/**
 * Listas publicadas de Find Me Gluten Free para un punto fuera de Argentina.
 * El navegador no puede leer ese sitio por CORS; este script lo hace en el server.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=1800');

$lat = isset($_GET['lat']) ? floatval($_GET['lat']) : 0;
$lon = isset($_GET['lon']) ? floatval($_GET['lon']) : 0;
if (!$lat || !$lon) {
    echo json_encode(['ok' => false, 'places' => []]);
    exit;
}

$cacheDir = __DIR__ . '/gf-cache';
$cacheFile = $cacheDir . '/world-' . round($lat, 2) . '-' . round($lon, 2) . '.json';
if (is_readable($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
    readfile($cacheFile);
    exit;
}

function gf_get($url)
{
    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 18,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/json',
            'Accept-Language: en,es;q=0.8',
        ],
        CURLOPT_USERAGENT => 'SinGlutenLife/1.0 (+https://singlutenlife.site/)',
    ]);
    $body = curl_exec($handle);
    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
    curl_close($handle);
    return $status >= 200 && $status < 300 ? $body : '';
}

function gf_slug($value)
{
    $text = @iconv('UTF-8', 'ASCII//TRANSLIT', $value);
    $text = strtolower($text ?: $value);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

$geo = json_decode(gf_get('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' . $lat . '&longitude=' . $lon . '&localityLanguage=en'), true);
$cc = strtolower($geo['countryCode'] ?? '');
if ($cc === 'gb') $cc = 'uk';
if ($cc === 'ar' || $cc === '') {
    echo json_encode(['ok' => true, 'places' => []]);
    exit;
}

$city = gf_slug($geo['city'] ?? $geo['locality'] ?? '');
$urls = [];
if ($cc === 'us') {
    $parts = explode('-', $geo['principalSubdivisionCode'] ?? '');
    $state = strtolower($parts[1] ?? '');
    if ($state && $city) $urls[] = "https://www.findmeglutenfree.com/us/{$state}/{$city}";
    $urls[] = 'https://www.findmeglutenfree.com/us';
} else {
    $urls[] = "https://www.findmeglutenfree.com/{$cc}";
    if ($city) $urls[] = "https://www.findmeglutenfree.com/{$cc}/{$city}";
}

$listings = [];
foreach ($urls as $url) {
    $html = gf_get($url);
    if (!$html) continue;
    $html = preg_replace('/<script[\s\S]*?<\/script>/i', "\n", $html);
    $html = preg_replace('/<style[\s\S]*?<\/style>/i', "\n", $html);
    $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $lines = preg_split('/\r\n|\n|\r/', $text);
    $clean = [];
    foreach ($lines as $line) {
        $line = trim(preg_replace('/\s+/', ' ', $line));
        if ($line !== '') $clean[] = $line;
    }
    for ($i = 0; $i < count($clean) - 1; $i++) {
        $name = $clean[$i];
        $addr = $clean[$i + 1];
        if (!preg_match('/[0-9].+,/', $addr)) {
            $addr = $clean[$i + 2] ?? '';
        }
        if (!preg_match('/[0-9].+,/', $addr)) continue;
        if (strlen($name) < 3 || strlen($name) > 70) continue;
        if (preg_match('/find me gluten|download|log in|gf menu|featured|reported|view |follow /i', $name)) continue;
        $listings[] = ['name' => $name, 'address' => $addr, 'url' => $url];
    }
    if (count($listings) >= 16) break;
}

$places = [];
$seen = [];
foreach (array_slice($listings, 0, 40) as $item) {
    $mark = strtolower($item['name'] . '|' . $item['address']);
    if (isset($seen[$mark])) continue;
    $seen[$mark] = true;
    $photon = json_decode(gf_get('https://photon.komoot.io/api/?q=' . rawurlencode($item['address']) . '&limit=1'), true);
    $coords = $photon['features'][0]['geometry']['coordinates'] ?? null;
    if (!$coords || count($coords) < 2) continue;
    $places[] = [
        'id' => 'fmgf-' . substr(sha1($mark), 0, 10),
        'name' => $item['name'],
        'type' => 'Sin TACC',
        'lat' => floatval($coords[1]),
        'lon' => floatval($coords[0]),
        'address' => $item['address'],
        'area' => '',
        'level' => 'opciones',
        'hours' => '',
        'photos' => [],
        'guide' => 'Find Me Gluten Free',
        'guideUrl' => $item['url'],
    ];
}

$payload = json_encode(['ok' => true, 'places' => $places], JSON_UNESCAPED_UNICODE);
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0775, true);
@file_put_contents($cacheFile, $payload);
echo $payload;
