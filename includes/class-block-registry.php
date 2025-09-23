<?php
/**
 * Block Registry for Weather Stations.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations;

/**
 * Class BlockRegistry
 * Handles registration of blocks and their assets.
 */
class BlockRegistry {
    /**
     * Instance of the class.
     *
     * @var self|null
     */
    private static ?self $instance = null;

    /**
     * Constructor.
     */
    private function __construct() {
        $this->init();
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
     * Initialize the class.
     *
     * @return void
     */
    private function init(): void {
        \add_action('init', [$this, 'registerBlocks']);
    }

    /**
     * Register blocks.
     *
     * @return void
     */
    public function registerBlocks(): void {
        // Register map block
        \register_block_type(
            PATH . 'build/blocks/map',
            [
                'render_callback' => [$this, 'renderMapBlock'],
            ]
        );
    }

    /**
     * Render the map block.
     *
     * @param array    $attributes Block attributes.
     * @param string   $content    Block content.
     * @param WP_Block $block      Block instance.
     * @return string Rendered block output.
     */
    public function renderMapBlock(array $attributes, string $content, \WP_Block $block): string {
        // Get settings
        $settings = \get_option('kst-weather-stations', []);
        
        // Get block attributes with defaults
        $title = $attributes['title'] ?? '';
        $showAllStations = $attributes['showAllStations'] ?? true;
        $selectedStations = $attributes['selectedStations'] ?? [];

        // Get stations
        $query_args = [
            'post_type' => 'weather_station',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ];

        if (!$showAllStations && !empty($selectedStations)) {
            $query_args['post__in'] = $selectedStations;
        }

        $stations = \get_posts($query_args);

        // Start output buffering
        \ob_start();

        // Title
        if (!empty($title)) {
            echo '<h2 class="weather-stations-map-title">' . \esc_html($title) . '</h2>';
        }

        // Map container
        echo '<div class="weather-stations-map-container" 
            data-mapbox-token="' . \esc_attr($settings['mapbox-token'] ?? '') . '"
            data-default-center="' . \esc_attr(\wp_json_encode($settings['mapbox-default-center'] ?? [])) . '"
            data-default-zoom="' . \esc_attr($settings['mapbox-zoom'] ?? '9') . '"
            data-theme="' . \esc_attr($settings['mapbox-theme'] ?? 'standard') . '"
            data-stations="' . \esc_attr(\wp_json_encode($this->getStationsData($stations))) . '"
        ></div>';

        // Return the buffered content
        return \ob_get_clean();
    }

    /**
     * Get formatted stations data for the map.
     *
     * @param WP_Post[] $stations Array of station posts.
     * @return array Formatted stations data.
     */
    private function getStationsData(array $stations): array {
        $data = [];

        foreach ($stations as $station) {
            $weather_data = \get_post_meta($station->ID, '_kst_ws_weather_data', true) ?: [];
            $lat = \get_post_meta($station->ID, '_kst_ws_latitude', true);
            $lng = \get_post_meta($station->ID, '_kst_ws_longitude', true);

            if (empty($lat) || empty($lng)) {
                continue;
            }

            $data[] = [
                'id' => $station->ID,
                'title' => \get_the_title($station),
                'lat' => (float) $lat,
                'lng' => (float) $lng,
                'weather' => $weather_data,
                'lastUpdate' => \get_post_meta($station->ID, '_kst_ws_last_update', true),
            ];
        }

        return $data;
    }
}
