<?php
/**
 * Geocoding service using Mapbox API.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\API;

/**
 * Class Geocoding
 * Handles geocoding and reverse geocoding operations.
 */
class Geocoding {
    /**
     * API base URL for geocoding.
     *
     * @var string
     */
    private const GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places/';

    /**
     * Meta keys for storing location data.
     *
     * @var array
     */
    private const META_KEYS = [
        'address'   => '_kst_ws_address',
        'latitude'  => '_kst_ws_latitude',
        'longitude' => '_kst_ws_longitude',
    ];

    /**
     * API key.
     *
     * @var string
     */
    private string $api_key;

    /**
     * Constructor.
     */
    public function __construct() {
        $this->api_key = \get_option('kst-weather-stations')['mapbox-token'] ?? '';
    }

    /**
     * Save location data to a post.
     *
     * @param int    $post_id Post ID.
     * @param string $address Address to save.
     * @param float  $lat     Latitude.
     * @param float  $lng     Longitude.
     * @return bool Whether the save was successful.
     */
    public function saveLocationData(int $post_id, string $address, float $lat, float $lng): bool {
        if (!\current_user_can('edit_post', $post_id)) {
            return false;
        }

        \update_post_meta($post_id, self::META_KEYS['address'], \sanitize_text_field($address));
        \update_post_meta($post_id, self::META_KEYS['latitude'], $lat);
        \update_post_meta($post_id, self::META_KEYS['longitude'], $lng);

        return true;
    }

    /**
     * Geocode an address and save the results to a post.
     *
     * @param int    $post_id Post ID.
     * @param string $address Address to geocode.
     * @return bool|\WP_Error True if successful, WP_Error on failure.
     */
    public function geocodeAndSave(int $post_id, string $address): bool|\WP_Error {
        $result = $this->geocode($address);
        if (\is_wp_error($result)) {
            return $result;
        }

        return $this->saveLocationData(
            $post_id,
            $result['formatted_address'],
            $result['coordinates']['lat'],
            $result['coordinates']['lng']
        );
    }

    /**
     * Reverse geocode coordinates and save the results to a post.
     *
     * @param int   $post_id Post ID.
     * @param float $lat     Latitude.
     * @param float $lng     Longitude.
     * @return bool|\WP_Error True if successful, WP_Error on failure.
     */
    public function reverseGeocodeAndSave(int $post_id, float $lat, float $lng): bool|\WP_Error {
        $result = $this->reverseGeocode($lat, $lng);
        if (\is_wp_error($result)) {
            return $result;
        }

        return $this->saveLocationData(
            $post_id,
            $result['address'],
            $lat,
            $lng
        );
    }

    /**
     * Geocode an address to coordinates.
     *
     * @param string $address Address to geocode.
     * @return array|\WP_Error Array with lat/lng or error.
     */
    public function geocode(string $address): array|\WP_Error {
        // URL encode the address and build the request URL
        $encoded_address = \urlencode($address);
        $request_url = self::GEOCODING_URL . $encoded_address . '.json';
        
        // Add parameters
        $params = [
            'access_token' => $this->api_key,
            'limit' => 1,
            'types' => 'address,place',
        ];

        $request_url = \add_query_arg($params, $request_url);

        // Make the request
        $response = \wp_remote_get($request_url);

        // Check for errors
        if (\is_wp_error($response)) {
            return $response;
        }

        // Get response code
        $response_code = \wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new \WP_Error(
                'geocoding_error',
                \sprintf(
                    /* translators: %d: HTTP response code */
                    \__('Geocoding API returned error code: %d', 'kst-weather-stations'),
                    $response_code
                )
            );
        }

        // Get and decode the body
        $body = \wp_remote_retrieve_body($response);
        $data = \json_decode($body, true);

        if (\json_last_error() !== JSON_ERROR_NONE) {
            return new \WP_Error(
                'json_decode_error',
                \__('Failed to decode API response', 'kst-weather-stations')
            );
        }

        // Check if we have results
        if (empty($data['features'])) {
            return new \WP_Error(
                'no_results',
                \__('No results found for this address', 'kst-weather-stations')
            );
        }

        // Get the first result
        $location = $data['features'][0];

        return [
            'coordinates' => [
                'lat' => $location['center'][1],
                'lng' => $location['center'][0],
            ],
            'formatted_address' => $location['place_name'],
        ];
    }

    /**
     * Reverse geocode coordinates to address.
     *
     * @param float $lat Latitude.
     * @param float $lng Longitude.
     * @return array|\WP_Error Array with address data or error.
     */
    public function reverseGeocode(float $lat, float $lng): array|\WP_Error {
        // Build the request URL
        $coordinates = $lng . ',' . $lat;
        $request_url = self::GEOCODING_URL . $coordinates . '.json';
        
        // Add parameters
        $params = [
            'access_token' => $this->api_key,
            'limit' => 1,
            'types' => 'address,place',
        ];

        $request_url = \add_query_arg($params, $request_url);

        // Make the request
        $response = \wp_remote_get($request_url);

        // Check for errors
        if (\is_wp_error($response)) {
            return $response;
        }

        // Get response code
        $response_code = \wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new \WP_Error(
                'reverse_geocoding_error',
                \sprintf(
                    /* translators: %d: HTTP response code */
                    \__('Reverse geocoding API returned error code: %d', 'kst-weather-stations'),
                    $response_code
                )
            );
        }

        // Get and decode the body
        $body = \wp_remote_retrieve_body($response);
        $data = \json_decode($body, true);

        if (\json_last_error() !== JSON_ERROR_NONE) {
            return new \WP_Error(
                'json_decode_error',
                \__('Failed to decode API response', 'kst-weather-stations')
            );
        }

        // Check if we have results
        if (empty($data['features'])) {
            return new \WP_Error(
                'no_results',
                \__('No results found for these coordinates', 'kst-weather-stations')
            );
        }

        // Get the first result
        $location = $data['features'][0];

        return [
            'address' => $location['place_name'],
            'context' => \array_map(function($context) {
                return [
                    'id' => $context['id'],
                    'text' => $context['text'],
                    'type' => \explode('.', $context['id'])[0],
                ];
            }, $location['context'] ?? []),
        ];
    }

    /**
     * Check if the API key is valid.
     *
     * @return bool Whether the API key is valid.
     */
    public function isValidApiKey(): bool {
        if (empty($this->api_key)) {
            return false;
        }

        // Test the API key with a sample request
        $test = $this->reverseGeocode(0, 0);
        
        // Even an invalid location should return a proper error response
        // A WP_Error with 'reverse_geocoding_error' means the request worked but returned an error
        // Any other type of error means the API key is likely invalid
        if (\is_wp_error($test)) {
            return $test->get_error_code() === 'reverse_geocoding_error';
        }

        return true;
    }
}