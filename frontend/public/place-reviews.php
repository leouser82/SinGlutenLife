<?php
/**
 * SinGluten Life — opiniones de un lugar (Hostinger).
 * Fuente de este archivo: este proyecto, no Nexo Studio.
 *
 * La lista no llama esto. CeliMap ya trae el puntaje de Google; los textos, si los tiene.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=1800');

function gf_curl_get($url)
{
    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Accept-Language: es-AR,es;q=0.9'],
        CURLOPT_USERAGENT => 'SinGlutenLife/1.0 (+https://nexosoft.site)',
    ]);
    $body = curl_exec($handle);
    curl_close($handle);
    return $body ?: '';
}

function gf_text($raw)
{
    foreach (['text', 'body', 'reviewBody', 'comment', 'content'] as $key) {
        if (!empty($raw[$key]) && is_string($raw[$key])) {
            return trim($raw[$key]);
        }
    }
    return '';
}

function gf_author($raw)
{
    if (!empty($raw['author']) && is_string($raw['author'])) {
        return $raw['author'];
    }
    if (!empty($raw['author']['name'])) {
        return $raw['author']['name'];
    }
    return $raw['authorName'] ?? $raw['user'] ?? 'Cliente';
}

function gf_map_review($raw, $source)
{
    $text = gf_text($raw);
    if (strlen($text) < 20 || preg_match('/[{}\[]|html:where|border-top|!important/', $text)) {
        return null;
    }
    return [
        'author' => mb_substr(trim((string) gf_author($raw)) ?: 'Cliente', 0, 40),
        'text' => mb_substr($text, 0, 320),
        'stars' => isset($raw['rating']) ? (float) $raw['rating'] : null,
        'source' => $source,
    ];
}

$id = preg_replace('/^cm-/', '', $_GET['id'] ?? '');
$guide = $_GET['guideUrl'] ?? '';
if (!preg_match('/^[a-f0-9]{20,}$/i', $id) && preg_match('#/lugar/([^/?#]+)#', $guide, $m)) {
    $id = $m[1];
}

$empty = ['reviews' => [], 'rating' => null, 'reviewCount' => null, 'mapsUrl' => '', 'googlePlaceId' => ''];
if ($id === '') {
    echo json_encode($empty);
    exit;
}

$place = json_decode(gf_curl_get('https://www.celimap.com.ar/api/places/' . rawurlencode($id)), true) ?: [];
$list = json_decode(gf_curl_get('https://www.celimap.com.ar/api/reviews?placeId=' . rawurlencode($id) . '&limit=20'), true);
$snap = $place['googleSnapshot'] ?? [];

$reviews = [];
foreach (($list['reviews'] ?? []) as $item) {
    $mapped = gf_map_review($item, 'CeliMap');
    if ($mapped) {
        $reviews[] = $mapped;
    }
}
foreach (($snap['reviews'] ?? []) as $item) {
    $mapped = gf_map_review($item, 'Google');
    if ($mapped) {
        $reviews[] = $mapped;
    }
}

echo json_encode([
    'reviews' => array_slice($reviews, 0, 8),
    'rating' => isset($snap['rating']) ? (float) $snap['rating'] : null,
    'reviewCount' => isset($snap['userRatingCount']) ? (int) $snap['userRatingCount'] : null,
    'mapsUrl' => $snap['googleMapsUri'] ?? '',
    'googlePlaceId' => $place['googlePlaceId'] ?? ($_GET['googlePlaceId'] ?? ''),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
