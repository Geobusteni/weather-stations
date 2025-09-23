<?php
/**
 * OpenWeather API Integration.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\API;

/**
 * Class OpenWeather
 * Handles integration with the OpenWeather API.
 */
class OpenWeather {
    /**
     * API base URL.
     *
     * @var string
     */
    private const API_URL = 'https://api.openweathermap.org/data/3.0/onecall';

    /**
     * Meta keys for storing weather data.
     *
     * @var array
     */
    private const META_KEYS = [
        'weather_data'  => '_kst_ws_weather_data',
        'last_update'   => '_kst_ws_last_update',
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
        $this->api_key = \get_option('kst-weather-stations')['data-token'] ?? '';
    }

    /**
     * Get formatted weather data for a station.
     *
     * @param int    $post_id Post ID of the weather station.
     * @param string $unit    Temperature unit ('celsius' or 'fahrenheit').
     * @return array Weather data formatted for frontend display.
     */
    public function getStationWeather(int $post_id, string $unit = 'celsius'): array {
        $weather_data = \get_post_meta($post_id, self::META_KEYS['weather_data'], true);
        $last_update = \get_post_meta($post_id, self::META_KEYS['last_update'], true);

        if (empty($weather_data)) {
            return [
                'temp' => null,
                'feels_like' => null,
                'humidity' => null,
                'wind_speed' => null,
                'wind_deg' => null,
                'weather' => [
                    'main' => null,
                    'description' => null,
                    'icon' => null,
                    'icon_url' => null,
                ],
                'last_update' => null,
                'needs_update' => true,
            ];
        }

        // Check if update is needed
        $interval = \get_option('kst-weather-stations')['data-interval'] ?? 24;
        $interval_seconds = (float) $interval * HOUR_IN_SECONDS;
        $needs_update = \time() - \strtotime($last_update) >= $interval_seconds;

        // Format data based on requested unit
        $speed_unit = $unit === 'celsius' ? 'metric' : 'imperial';
        $speed_label = $unit === 'celsius' ? 'm/s' : 'mph';

        return [
            'temp' => [
                'value' => $weather_data['temp'][$unit] ?? null,
                'unit' => $unit === 'celsius' ? '°C' : '°F',
            ],
            'feels_like' => [
                'value' => $weather_data['feels_like'][$unit] ?? null,
                'unit' => $unit === 'celsius' ? '°C' : '°F',
            ],
            'humidity' => [
                'value' => $weather_data['humidity'] ?? null,
                'unit' => '%',
            ],
            'wind_speed' => [
                'value' => $weather_data['wind_speed'][$speed_unit] ?? null,
                'unit' => $speed_label,
            ],
            'wind_deg' => $weather_data['wind_deg'] ?? null,
            'weather' => [
                'main' => $weather_data['weather']['main'] ?? null,
                'description' => $weather_data['weather']['description'] ?? null,
                'icon' => $weather_data['weather']['icon'] ?? null,
                'icon_url' => isset($weather_data['weather']['icon']) 
                    ? self::getWeatherIconUrl($weather_data['weather']['icon'])
                    : null,
            ],
            'last_update' => [
                'timestamp' => $weather_data['timestamp'] ?? null,
                'formatted' => $last_update 
                    ? \wp_date(
                        \sprintf(
                            /* translators: 1: Date format, 2: Time format */
                            \_x('%1$s at %2$s', 'weather data timestamp', 'kst-weather-stations'),
                            \get_option('date_format'),
                            \get_option('time_format')
                        ),
                        \strtotime($last_update)
                    )
                    : null,
            ],
            'needs_update' => $needs_update,
        ];
    }

    /**
     * Get weather data for multiple stations.
     *
     * @param array  $post_ids Array of post IDs.
     * @param string $unit     Temperature unit ('celsius' or 'fahrenheit').
     * @return array Array of weather data indexed by post ID.
     */
    public function getMultipleStationsWeather(array $post_ids, string $unit = 'celsius'): array {
        $results = [];
        foreach ($post_ids as $post_id) {
            $results[$post_id] = $this->getStationWeather($post_id, $unit);
        }
        return $results;
    }

    /**
     * Get weather data for a station and save it.
     *
     * @param int   $post_id Post ID of the weather station.
     * @param float $lat     Latitude.
     * @param float $lon     Longitude.
     * @return array|\WP_Error Weather data or error.
     */
    public function getAndSaveWeatherData(int $post_id, float $lat, float $lon): array|\WP_Error {
        // Check if update is needed based on interval setting
        $last_update = \get_post_meta($post_id, self::META_KEYS['last_update'], true);
        $interval = \get_option('kst-weather-stations')['data-interval'] ?? 24; // Default to 24 hours
        $interval_seconds = (float) $interval * HOUR_IN_SECONDS;

        if ($last_update && (\time() - \strtotime($last_update)) < $interval_seconds) {
            return \get_post_meta($post_id, self::META_KEYS['weather_data'], true) ?: [];
        }

        // Get weather data in both units
        $metric_data = $this->getCurrentWeather($lat, $lon, ['units' => 'metric']);
        if (\is_wp_error($metric_data)) {
            return $metric_data;
        }

        $imperial_data = $this->getCurrentWeather($lat, $lon, ['units' => 'imperial']);
        if (\is_wp_error($imperial_data)) {
            return $imperial_data;
        }

        // Combine the data
        $weather_data = [
            'temp' => [
                'celsius' => $metric_data['temp'],
                'fahrenheit' => $imperial_data['temp'],
            ],
            'feels_like' => [
                'celsius' => $metric_data['feels_like'],
                'fahrenheit' => $imperial_data['feels_like'],
            ],
            'humidity' => $metric_data['humidity'], // Same in both units
            'wind_speed' => [
                'metric' => $metric_data['wind_speed'], // m/s
                'imperial' => $imperial_data['wind_speed'], // mph
            ],
            'wind_deg' => $metric_data['wind_deg'], // Same in both units
            'weather' => $metric_data['weather'], // Same in both units
            'timestamp' => $metric_data['timestamp'], // Same in both units
        ];

        // Save the data
        \update_post_meta($post_id, self::META_KEYS['weather_data'], $weather_data);
        \update_post_meta($post_id, self::META_KEYS['last_update'], \current_time('mysql'));

        return $weather_data;
    }

    /**
     * Get current weather data for a location.
     *
     * @param float $lat     Latitude.
     * @param float $lon     Longitude.
     * @param array $options Additional options.
     * @return array|\WP_Error Weather data or error.
     */
    public function getCurrentWeather(float $lat, float $lon, array $options = []): array|\WP_Error {
        // Build query parameters
        $params = \array_merge([
            'lat' => $lat,
            'lon' => $lon,
            'exclude' => 'minutely,hourly,daily,alerts',
            'units' => 'metric',
            'appid' => $this->api_key,
        ], $options);

        // Build request URL
        $request_url = \add_query_arg($params, self::API_URL);

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
                'openweather_api_error',
                \sprintf(
                    /* translators: %d: HTTP response code */
                    \__('OpenWeather API returned error code: %d', 'kst-weather-stations'),
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

        // Extract and format the current weather data
        return $this->formatWeatherData($data);
    }

    /**
     * Format the weather data for storage.
     *
     * @param array $data Raw API response data.
     * @return array Formatted weather data.
     */
    private function formatWeatherData(array $data): array {
        $current = $data['current'] ?? [];

        return [
            'temp' => $current['temp'] ?? null,
            'feels_like' => $current['feels_like'] ?? null,
            'humidity' => $current['humidity'] ?? null,
            'wind_speed' => $current['wind_speed'] ?? null,
            'wind_deg' => $current['wind_deg'] ?? null,
            'weather' => [
                'main' => $current['weather'][0]['main'] ?? null,
                'description' => $current['weather'][0]['description'] ?? null,
                'icon' => $current['weather'][0]['icon'] ?? null,
            ],
            'timestamp' => $current['dt'] ?? \time(),
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
        $test = $this->getCurrentWeather(0, 0);
        
        // Even an invalid location should return a proper error response
        // A WP_Error with 'openweather_api_error' means the request worked but returned an error
        // Any other type of error means the API key is likely invalid
        if (\is_wp_error($test)) {
            return $test->get_error_code() === 'openweather_api_error';
        }

        return true;
    }

    /**
     * Get the weather icon URL.
     *
     * @param string $icon_code Icon code from the API.
     * @return string Icon URL.
     */
    public static function getWeatherIconUrl(string $icon_code): string {
        return \sprintf('https://openweathermap.org/img/wn/%s@2x.png', $icon_code);
    }
}