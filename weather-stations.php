<?php
/**
 * Plugin Name: Wheather Stations (Test Assignment)
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

if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

// Defined the constants we will use for JS enqueuing.
const VERSION = "1.0.0";
define( "KST\WeatherStations\URL", \plugin_dir_url( __FILE__ ) );
define( "KST\WeatherStations\PATH", \plugin_dir_path( __FILE__ ) );



// Plugin backend.
if ( \is_admin() ) {
	Settings::getInstance();
}

