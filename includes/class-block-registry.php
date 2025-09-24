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
        \add_action('wp_enqueue_scripts', [$this, 'enqueueMapboxAssets']);
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
     * Enqueue Mapbox assets.
     *
     * @return void
     */
    public function enqueueMapboxAssets(): void {
        // Only enqueue if the current post/page contains our block
        if (!\has_block('kst-weather-stations/map')) {
            return;
        }

        \wp_enqueue_style(
            'mapbox-gl',
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
            [],
            '2.15.0'
        );

        \wp_enqueue_script(
            'mapbox-gl',
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
            [],
            '2.15.0',
            true
        );

        // Add dashicons for our markers
        \wp_enqueue_style('dashicons');
    }

    /**
     * Render the map block.
     *
     * @param array    $attributes Block attributes.
     *
     * @return string Rendered block output.
     */
    public function renderMapBlock(array $attributes): string {
        // Get block attributes with defaults
        $settings           = \get_option('kst-weather-stations');
        $title             = $attributes['title'] ?? '';
        $show_all_stations = $attributes['showAllStations'] ?? true;
        $selected_stations = $attributes['selectedStations'] ?? [];

        // Get center coordinates from settings
        $center = $settings['mapbox-default-center'] ?? [];
        $lat = isset($center['lat']) ? (float) $center['lat'] : 44.4268; // Default to Bucharest
        $lng = isset($center['lng']) ? (float) $center['lng'] : 26.1025;

        $map_params = [
            'class'      => 'weather-stations-map',
            'data-token' => $settings['mapbox-token'] ?? '',
            'data-center-lat' => $lat,
            'data-center-lng' => $lng,
            'data-zoom' => $settings['mapbox-zoom'] ?? 16,
            'data-theme' => $settings['mapbox-theme'] ?? 'standard',
        ];

        if ($show_all_stations) {
            $selected_stations = \get_posts(
                [
                    'post_type'      => 'weather-station',
                    'posts_per_page' => -1,
                    'post_status'    => 'publish',
                    'fields'         => 'ids',
                    'order'          => 'ASC',
                    'orderby'        => 'title',
                ]
            );
        }

        $map_params = \array_merge($map_params, [
            'data-stations' => \implode(',', $selected_stations),
        ]);

        $wrapper_attributes = \get_block_wrapper_attributes($map_params);

		$title_html = $title ? \sprintf('<h2 class="weather-stations-map-title">%s</h2>', \esc_html($title)) : '';
        $button_text = \__('Show Saved Locations', 'kst-weather-stations');
        return \sprintf(
			'<div class="weather-stations-map-wrapper">
                <div class="weather-station-overlay">%s</div>
                <div class="weather-stations-map-content">
                    <div class="weather-stations-sidebar">
                        <div class="sidebar-controls">
                            <button class="unit-toggle active" data-unit="celsius">°C</button>
                            <button class="unit-toggle" data-unit="fahrenheit">°F</button>
                            <button class="show-saved-button">%s</button>
                        </div>
                        <div class="station-info">
                            <div class="weather-info" style="display: none;">
                                <h3 class="station-name"></h3>
                                <p class="station-address"></p>
                                <div class="weather-data"></div>
                            </div>
                            <div class="saved-stations" style="display: none;">
                                <div class="saved-stations-list"></div>
                                <button class="close-saved-button">%s</button>
                            </div>
                        </div>
                    </div>
                    <div %s></div>
                </div>
            </div>',
			$title_html,
            \__('Show Saved Locations', 'kst-weather-stations'),
            \__('Close', 'kst-weather-stations'),
			$wrapper_attributes
        );
    }
}
