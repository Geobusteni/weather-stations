<?php
/**
 * Admin class for Weather Stations.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\Admin;

use KST\WeatherStations\API\OpenWeather;

/**
 * Class Admin
 * Handles all admin-related functionality for weather stations.
 */
class Admin {
    /**
     * Instance of the class.
     *
     * @var self|null
     */
    private static ?self $instance = null;

    /**
     * Post type name.
     *
     * @var string
     */
    private const POST_TYPE = 'weather_station';

    /**
     * Meta keys for the weather station.
     *
     * @var array
     */
    private const META_KEYS = [
        'address'      => '_kst_ws_address',
        'latitude'     => '_kst_ws_latitude',
        'longitude'    => '_kst_ws_longitude',
        'last_update'  => '_kst_ws_last_update',
        'weather_data' => '_kst_ws_weather_data',
    ];

    /**
     * Constructor.
     */
    private function __construct() {
        $this->init();
    }

    /**
     * Initialize the class.
     *
     * @return void
     */
    private function init(): void {
        // Register post type
        \add_action('init', [$this, 'registerPostType']);

        // Register meta
        \add_action('init', [$this, 'registerMeta']);

        // Register scripts
        \add_action('enqueue_block_editor_assets', [$this, 'enqueueEditorAssets']);

        // Add admin columns
        \add_filter('manage_' . self::POST_TYPE . '_posts_columns', [$this, 'addAdminColumns']);
        \add_action('manage_' . self::POST_TYPE . '_posts_custom_column', [$this, 'renderAdminColumns'], 10, 2);

        // Add manual refresh action
        \add_action('admin_init', [$this, 'registerRefreshAction']);

        // Setup cron
        \add_action('wp', [$this, 'setupCron']);
        \add_action('kst_weather_stations_hourly_update', [$this, 'updateAllStations']);

        // Register REST API endpoints
        \add_action('rest_api_init', [$this, 'registerRestRoutes']);
    }

    /**
     * Get instance of the class.
     *
     * @return self
     */
    public static function getInstance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Register the weather station post type.
     *
     * @return void
     */
    public function registerPostType(): void {
        \register_post_type(
            self::POST_TYPE,
            [
                'labels' => [
                    'name'               => \__('Weather Stations', 'kst-weather-stations'),
                    'singular_name'      => \__('Weather Station', 'kst-weather-stations'),
                    'add_new'           => \__('Add New Station', 'kst-weather-stations'),
                    'add_new_item'      => \__('Add New Weather Station', 'kst-weather-stations'),
                    'edit_item'         => \__('Edit Weather Station', 'kst-weather-stations'),
                    'new_item'          => \__('New Weather Station', 'kst-weather-stations'),
                    'view_item'         => \__('View Weather Station', 'kst-weather-stations'),
                    'search_items'      => \__('Search Weather Stations', 'kst-weather-stations'),
                    'not_found'         => \__('No weather stations found', 'kst-weather-stations'),
                    'not_found_in_trash'=> \__('No weather stations found in trash', 'kst-weather-stations'),
                ],
                'public'              => true,
                'has_archive'         => true,
                'show_in_rest'        => true,
                'supports'            => ['title', 'editor', 'thumbnail'],
                'menu_icon'           => 'dashicons-location',
                'rewrite'             => ['slug' => 'weather-stations'],
                'template'            => [
                    ['core/paragraph', ['placeholder' => \__('Add station description...', 'kst-weather-stations')]],
                ],
                'template_lock'       => false,
            ]
        );
    }

    /**
     * Register meta fields for the weather station post type.
     *
     * @return void
     */
    public function registerMeta(): void {
        \register_post_meta(self::POST_TYPE, self::META_KEYS['address'], [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback' => function() {
                return \current_user_can('edit_posts');
            },
        ]);

        \register_post_meta(self::POST_TYPE, self::META_KEYS['latitude'], [
            'type' => 'number',
            'single' => true,
            'show_in_rest' => true,
            'sanitize_callback' => 'floatval',
            'auth_callback' => function() {
                return \current_user_can('edit_posts');
            },
        ]);

        \register_post_meta(self::POST_TYPE, self::META_KEYS['longitude'], [
            'type' => 'number',
            'single' => true,
            'show_in_rest' => true,
            'sanitize_callback' => 'floatval',
            'auth_callback' => function() {
                return \current_user_can('edit_posts');
            },
        ]);

        \register_post_meta(self::POST_TYPE, self::META_KEYS['last_update'], [
            'type' => 'string',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function() {
                return \current_user_can('edit_posts');
            },
        ]);

        \register_post_meta(self::POST_TYPE, self::META_KEYS['weather_data'], [
            'type' => 'object',
            'single' => true,
            'show_in_rest' => [
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'temp' => ['type' => 'number'],
                        'feels_like' => ['type' => 'number'],
                        'humidity' => ['type' => 'number'],
                        'wind_speed' => ['type' => 'number'],
                        'wind_deg' => ['type' => 'number'],
                        'weather' => [
                            'type' => 'object',
                            'properties' => [
                                'main' => ['type' => 'string'],
                                'description' => ['type' => 'string'],
                                'icon' => ['type' => 'string'],
                            ],
                        ],
                        'timestamp' => ['type' => 'number'],
                    ],
                ],
            ],
            'auth_callback' => function() {
                return \current_user_can('edit_posts');
            },
        ]);
    }

    /**
     * Enqueue editor assets.
     *
     * @return void
     */
    public function enqueueEditorAssets(): void {
        $asset_file = include \KST\WeatherStations\PATH . 'build/admin/assets.php';

        \wp_enqueue_script(
            'kst-weather-stations-editor-js',
            \KST\WeatherStations\URL . 'build/admin/editor.js',
            $asset_file['dependencies'] ?? [],
            $asset_file['version'] ?? \filemtime(\KST\WeatherStations\URL . 'build/admin/editor.js'),
            true
        );

        \wp_localize_script('kst-weather-stations-editor-js', 'kstWeatherStations', [
            'mapToken' => \get_option('kst_mapbox_token', ''),
            'weatherToken' => \get_option('kst_weather_api_key', ''),
            'restNonce' => \wp_create_nonce('wp_rest'),
            'restUrl' => \rest_url('kst-weather-stations/v1'),
        ]);

        \wp_enqueue_style(
            'kst-weather-stations-editor-css',
            \KST\WeatherStations\URL . 'build/admin/editor.css',
            [],
            $asset_file['version'] ?? \filemtime(\KST\WeatherStations\URL . 'build/admin/editor.css')
        );
    }

    /**
     * Add custom columns to the admin list.
     *
     * @param array $columns Array of column names.
     * @return array Modified array of column names.
     */
    public function addAdminColumns(array $columns): array {
        $date = $columns['date'];
        unset($columns['date']);

        $columns['location'] = \__('Location', 'kst-weather-stations');
        $columns['weather'] = \__('Current Weather', 'kst-weather-stations');
        $columns['last_update'] = \__('Last Update', 'kst-weather-stations');
        $columns['date'] = $date;

        return $columns;
    }

    /**
     * Render custom column content.
     *
     * @param string $column Column name.
     * @param int $post_id Post ID.
     * @return void
     */
    public function renderAdminColumns(string $column, int $post_id): void {
        switch ($column) {
            case 'location':
                $address = \get_post_meta($post_id, self::META_KEYS['address'], true);
                echo \esc_html($address);
                break;

            case 'weather':
                $weather_data = \get_post_meta($post_id, self::META_KEYS['weather_data'], true);
                if ($weather_data) {
                    echo \esc_html(\sprintf(
                        \__('%s°C, %s%% humidity', 'kst-weather-stations'),
                        $weather_data['temp'] ?? '',
                        $weather_data['humidity'] ?? ''
                    ));
                } else {
                    echo '—';
                }
                break;

            case 'last_update':
                $last_update = \get_post_meta($post_id, self::META_KEYS['last_update'], true);
                if ($last_update) {
                    echo \esc_html(\wp_date(
                        \get_option('date_format') . ' ' . \get_option('time_format'),
                        \strtotime($last_update)
                    ));
                } else {
                    echo '—';
                }
                break;
        }
    }

    /**
     * Register the manual refresh action.
     *
     * @return void
     */
    public function registerRefreshAction(): void {
        \add_action('admin_post_refresh_weather_data', [$this, 'handleManualRefresh']);
    }

    /**
     * Handle manual refresh of weather data.
     *
     * @return void
     */
    public function handleManualRefresh(): void {
        // Check if we have a post ID
        if (!isset($_GET['post_id'])) {
            \wp_die(\__('No station specified', 'kst-weather-stations'));
        }

        $post_id = (int) $_GET['post_id'];

        // Verify nonce
        if (!isset($_GET['_wpnonce']) || !\wp_verify_nonce($_GET['_wpnonce'], 'refresh_weather_data_' . $post_id)) {
            \wp_die(\__('Security check failed', 'kst-weather-stations'));
        }

        // Check permissions
        if (!\current_user_can('edit_post', $post_id)) {
            \wp_die(\__('You do not have permission to do this', 'kst-weather-stations'));
        }

        // Update the weather data
        $this->updateStationWeather($post_id);

        // Redirect back
        \wp_safe_redirect(\get_edit_post_link($post_id, 'url'));
        exit;
    }

    /**
     * Setup the cron job for weather updates.
     *
     * @return void
     */
    public function setupCron(): void {
        $interval = \get_option('kst-weather-stations')['data-interval'] ?? 1; // Default to 1 hour
        $schedule = $interval <= 0.5 ? 'thirty_minutes' : 'hourly';

        // Add custom schedule if needed
        \add_filter('cron_schedules', function($schedules) {
            if (!isset($schedules['thirty_minutes'])) {
                $schedules['thirty_minutes'] = [
                    'interval' => 1800,
                    'display' => \__('Every 30 minutes', 'kst-weather-stations'),
                ];
            }
            return $schedules;
        });

        // Clear existing schedule if interval changed
        $timestamp = \wp_next_scheduled('kst_weather_stations_hourly_update');
        if ($timestamp) {
            \wp_unschedule_event($timestamp, 'kst_weather_stations_hourly_update');
        }

        if (!\wp_next_scheduled('kst_weather_stations_hourly_update')) {
            \wp_schedule_event(\time(), $schedule, 'kst_weather_stations_hourly_update');
        }
    }

    /**
     * Update weather data for all stations.
     *
     * @return void
     */
    public function updateAllStations(): void {
        $stations = \get_posts([
            'post_type' => self::POST_TYPE,
            'posts_per_page' => -1,
            'post_status' => ['publish', 'draft'],
        ]);

        foreach ($stations as $station) {
            $this->updateStationWeather($station->ID);
        }
    }

    /**
     * Update weather data for a single station.
     *
     * @param int $post_id Post ID.
     * @return bool Whether the update was successful.
     */
    private function updateStationWeather(int $post_id): bool {
        // Get station coordinates
        $latitude = \get_post_meta($post_id, self::META_KEYS['latitude'], true);
        $longitude = \get_post_meta($post_id, self::META_KEYS['longitude'], true);

        if (empty($latitude) || empty($longitude)) {
            return false;
        }

        // Check if update is needed based on global interval setting
        $last_update = \get_post_meta($post_id, self::META_KEYS['last_update'], true);
        $interval = \get_option('kst-weather-stations')['data-interval'] ?? 1; // Default to 1 hour
        
        if ($last_update) {
            $next_update = \strtotime($last_update) + ($interval * HOUR_IN_SECONDS);
            if (\time() < $next_update) {
                return true; // Skip update if not time yet
            }
        }

        // Get weather data
        $api = new OpenWeather();
        $weather_data = $api->getCurrentWeather((float) $latitude, (float) $longitude);

        if (\is_wp_error($weather_data)) {
            // Log error and return false
            \error_log(\sprintf(
                'Weather station update failed for post %d: %s',
                $post_id,
                $weather_data->get_error_message()
            ));
            return false;
        }

        // Update post meta
        \update_post_meta($post_id, self::META_KEYS['weather_data'], $weather_data);
        \update_post_meta($post_id, self::META_KEYS['last_update'], \current_time('mysql'));

        return true;
    }

    /**
     * Register REST API routes.
     *
     * @return void
     */
    public function registerRestRoutes(): void {
        \register_rest_route('kst-weather-stations/v1', '/geocode', [
            'methods' => 'GET',
            'callback' => [$this, 'handleGeocodeRequest'],
            'permission_callback' => function() {
                return \current_user_can('edit_posts');
            },
            'args' => [
                'address' => [
                    'required' => true,
                    'type' => 'string',
                ],
            ],
        ]);

        \register_rest_route('kst-weather-stations/v1', '/reverse-geocode', [
            'methods' => 'GET',
            'callback' => [$this, 'handleReverseGeocodeRequest'],
            'permission_callback' => function() {
                return \current_user_can('edit_posts');
            },
            'args' => [
                'lat' => [
                    'required' => true,
                    'type' => 'number',
                ],
                'lng' => [
                    'required' => true,
                    'type' => 'number',
                ],
            ],
        ]);

        \register_rest_route('kst-weather-stations/v1', '/refresh-weather/(?P<id>\\d+)', [
            'methods' => 'POST',
            'callback' => [$this, 'handleWeatherRefreshRequest'],
            'permission_callback' => function() {
                return \current_user_can('edit_posts');
            },
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                ],
            ],
        ]);
    }

    /**
     * Handle geocoding request.
     *
     * @param \WP_REST_Request $request Request object.
     * @return \WP_REST_Response|\WP_Error Response object.
     */
    public function handleGeocodeRequest(\WP_REST_Request $request) {
        $address = $request->get_param('address');

        $geocoding = new \KST\WeatherStations\API\Geocoding();
        $result = $geocoding->geocode($address);

        if (\is_wp_error($result)) {
            return new \WP_REST_Response([
                'error' => $result->get_error_message(),
            ], 400);
        }

        return new \WP_REST_Response($result);
    }

    /**
     * Handle reverse geocoding request.
     *
     * @param \WP_REST_Request $request Request object.
     * @return \WP_REST_Response|\WP_Error Response object.
     */
    public function handleReverseGeocodeRequest(\WP_REST_Request $request) {
        $lat = $request->get_param('lat');
        $lng = $request->get_param('lng');

        $geocoding = new \KST\WeatherStations\API\Geocoding();
        $result = $geocoding->reverseGeocode((float) $lat, (float) $lng);

        if (\is_wp_error($result)) {
            return new \WP_REST_Response([
                'error' => $result->get_error_message(),
            ], 400);
        }

        return new \WP_REST_Response($result);
    }

    /**
     * Handle weather refresh request.
     *
     * @param \WP_REST_Request $request Request object.
     * @return \WP_REST_Response|\WP_Error Response object.
     */
    public function handleWeatherRefreshRequest(\WP_REST_Request $request) {
        $post_id = $request->get_param('id');

        if ($this->updateStationWeather($post_id)) {
            return new \WP_REST_Response([
                'success' => true,
                'data' => \get_post_meta($post_id, self::META_KEYS['weather_data'], true),
                'last_update' => \get_post_meta($post_id, self::META_KEYS['last_update'], true),
            ]);
        }

        return new \WP_REST_Response(['error' => 'Failed to update weather data'], 500);
    }
}