<?php
/**
 * The interface used in the abstract class to render the HTML for the settings fields.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\Admin\Fields;

/**
 * SettingFieldInterface is used as interface in the abstract class KSTAbstractField.
 *
 * @see \KST\WeatherStations\Admin\Fields\KSTAbstractField
 */
interface SettingFieldInterface {
	public function render(): string;
};
