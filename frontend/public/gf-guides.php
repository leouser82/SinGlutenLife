<?php
/**
 * SinGluten Life — proxy de CeliMap (Hostinger).
 * Fuente de este archivo: este proyecto, no Nexo Studio.
 *
 * El navegador no puede pedirle los datos directo porque la API no habilita
 * CORS. Este script los baja una vez por dia, los guarda en disco y los
 * entrega tal cual vienen: el filtrado y el armado de la ficha los hace la app.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=3600');

// Son 1,6 MB de JSON: comprimidos viajan en una fracción.
if (
    function_exists('ob_gzhandler')
    && strpos($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip') !== false
) {
    ob_start('ob_gzhandler');
}

const CELIMAP_URL = 'https://www.celimap.com.ar/api/places';
const PAGE_SIZE = 100;
const MAX_PAGES = 24;
const TTL_SECONDS = 86400;

$cacheDir = __DIR__ . '/gf-cache';
$cacheFile = $cacheDir . '/celimap.json';

if (is_readable($cacheFile) && (time() - filemtime($cacheFile)) < TTL_SECONDS) {
    readfile($cacheFile);
    exit;
}

/** Un pedido a la API, con los encabezados que espera un navegador. */
function gf_curl($url)
{
    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Accept-Language: es-AR,es;q=0.9',
        ],
        CURLOPT_USERAGENT => 'SinGlutenLife/1.0 (+https://nexostudio.com.ar)',
    ]);
    return $handle;
}

function gf_fetch_page($page)
{
    $handle = gf_curl(CELIMAP_URL . '?limit=' . PAGE_SIZE . '&page=' . $page);
    $body = curl_exec($handle);
    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
    curl_close($handle);
    if ($status !== 200 || !$body) {
        return null;
    }
    return json_decode($body, true);
}

/** Las paginas restantes van juntas: 18 pedidos en serie tardarian demasiado. */
function gf_fetch_rest($pages)
{
    $multi = curl_multi_init();
    $handles = [];
    for ($page = 2; $page <= $pages; $page++) {
        $handle = gf_curl(CELIMAP_URL . '?limit=' . PAGE_SIZE . '&page=' . $page);
        curl_multi_add_handle($multi, $handle);
        $handles[] = $handle;
    }

    $running = null;
    do {
        curl_multi_exec($multi, $running);
        if ($running) {
            curl_multi_select($multi, 1.0);
        }
    } while ($running > 0);

    $places = [];
    foreach ($handles as $handle) {
        $body = curl_multi_getcontent($handle);
        curl_multi_remove_handle($multi, $handle);
        curl_close($handle);
        $data = $body ? json_decode($body, true) : null;
        if (!empty($data['places'])) {
            $places = array_merge($places, $data['places']);
        }
    }
    curl_multi_close($multi);
    return $places;
}

function gf_serve_stale_or_fail($cacheFile)
{
    if (is_readable($cacheFile)) {
        header('X-Gf-Cache: stale');
        readfile($cacheFile);
        exit;
    }
    http_response_code(200);
    echo json_encode(['places' => [], 'error' => 'guia-no-disponible']);
    exit;
}

$first = gf_fetch_page(1);
if (empty($first['places'])) {
    gf_serve_stale_or_fail($cacheFile);
}

$pages = isset($first['pagination']['pages']) ? (int) $first['pagination']['pages'] : 1;
$pages = max(1, min($pages, MAX_PAGES));
$places = $first['places'];
if ($pages > 1) {
    $places = array_merge($places, gf_fetch_rest($pages));
}

$payload = json_encode([
    'places' => $places,
    'total' => count($places),
    'fetchedAt' => gmdate('c'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if (!$payload) {
    gf_serve_stale_or_fail($cacheFile);
}

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
$temp = $cacheFile . '.' . getmypid() . '.tmp';
if (@file_put_contents($temp, $payload) !== false) {
    @rename($temp, $cacheFile);
}

echo $payload;
