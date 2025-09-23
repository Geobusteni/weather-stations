<?php
/**
 * Plugin Name: Weather Stations (Test Assignment)
 * Plugin Description: A plugin which gets weather data from different meteorological stations and shares the data through the OpenStreet maps.
 * Author: Alexandru Negoita
 * Author URI: https://kul.site
 * Version: 1.0.0
 * License: GPL2+
 * License URI:https://www.gnu.org/licenses/gpl-2.0.html
 * Domain Path: /languages
 * Text Domain: kst-weather-stations
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations;

// Autoload the dependencies.
use KST\WeatherStations\Admin\Settings;
use KST\WeatherStations\Admin\Admin;
use KST\WeatherStations\API\Geocoding;
use KST\WeatherStations\BlockRegistry;
use KST\WeatherStations\API\OpenWeather;

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// Define constants for JS enqueuing.
const VERSION = '1.0.0';
define('KST\WeatherStations\URL', \plugin_dir_url(__FILE__));
define('KST\WeatherStations\PATH', \plugin_dir_path(__FILE__));

// Initiate de admin.
Admin::getInstance();

/**
 * Get instance of the Geocoding class.
 *
 * @return Geocoding
 */
function get_geocoding(): Geocoding {
    static $instance = null;
    if (null === $instance) {
        $instance = new Geocoding();
    }
    return $instance;
}

/**
 * Get instance of the OpenWeather class.
 *
 * @return OpenWeather
 */
function get_weather(): OpenWeather {
    static $instance = null;
    if (null === $instance) {
        $instance = new OpenWeather();
    }
    return $instance;
}

/**
 * Initialize plugin functionality.
 *
 * @return void
 */
function init(): void {
    // Plugin backend.
    if (\is_admin()) {
        Settings::getInstance();
    }

	// Register blocks
    BlockRegistry::getInstance();
}

// Initialize the plugin.
\add_action('plugins_loaded', __NAMESPACE__ . '\init');

// Register activation hook.
\register_activation_hook(__FILE__, function() {
    // Create the map page
    $page_id = \wp_insert_post([
        'post_title'   => \__('Weather Stations Map', 'kst-weather-stations'),
        'post_content' => '<!-- wp:kst-weather-stations/map /-->',
        'post_status'  => 'publish',
        'post_type'    => 'page',
    ]);

    if (!is_wp_error($page_id)) {
        // Store the page ID in plugin settings
	    handle_map_page( $page_id );
    }

    // Clear permalinks
    \flush_rewrite_rules();
});

function handle_map_page( int $newId ): bool {
	$settings = \get_option('kst-weather-stations', []);
	$oldId = $settings['map-page'] ?? -1;

	if ( $newId !== $oldId ) {
		\delete_post_meta( $oldId, '_kst_ws_map_only', 1 );

		\update_option('kst-weather-stations', $settings);

		\update_post_meta( $newId, '_kst_ws_map_only', 1 );

		return true;
	}

	return false;
}

add_action( 'update_option_kst-weather-stations', function( $old_value, $new_value ) {
	$map_page = $new_value['map-page'] ?? -1;
	$old_page = $old_value['map-page'] ?? -1;

	if ( $map_page !== $old_page ) {
		handle_map_page( $map_page ); // safe, won't loop
	}
}, 10, 2 );

// Register deactivation hook.
\register_deactivation_hook(__FILE__, function() {
	$settings = \get_option('kst-weather-stations', []);
	$map_page = $settings['map-page'] ?? -1;

	\delete_post_meta( $map_page, '_kst_ws_map_only', 1 );

	$settings['map-page'] = '';

	\update_option('kst-weather-stations', $settings);

    // Clear any scheduled cron jobs
    $timestamp = \wp_next_scheduled('kst_weather_stations_hourly_update');
    if ($timestamp) {
        \wp_unschedule_event($timestamp, 'kst_weather_stations_hourly_update');
    }

    // Clear permalinks
    \flush_rewrite_rules();
});

// Add settings link on plugin page.
\add_filter('plugin_action_links_' . \plugin_basename(__FILE__), function($links) {
    $settings_link = \sprintf(
        '<a href="%s">%s</a>',
        \admin_url('options-general.php?page=kst-weather-stations'),
        \__('Settings', 'kst-weather-stations')
    );
    \array_unshift($links, $settings_link);

    // Add "View Map" link if we have a map page set
    $settings = \get_option('kst-weather-stations');
    if (!empty($settings['map-page'])) {
        $map_link = \sprintf(
            '<a href="%s">%s</a>',
            \get_permalink($settings['map-page']),
            \__('View Map', 'kst-weather-stations')
        );
        \array_unshift($links, $map_link);
    }

    return $links;
});

add_filter( 'template_include', function( $template ) {
	if ( ! is_admin() && is_page() ) {
		global $post;

		// Replace with your page ID or meta key
		if ( get_post_meta( $post->ID, '_kst_ws_map_only', true ) ) {
			// Load plugin template instead of theme
			$plugin_template = __DIR__ . '/templates/page-map-only.php';
			if ( file_exists( $plugin_template ) ) {
				return $plugin_template;
			}
		}
	}

	return $template;
});

