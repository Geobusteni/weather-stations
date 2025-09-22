<?php
/**
 * This factory will implement each field classes, considering the type of field we want to render.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\Admin\Fields;

/**
 * Factory class for field rendering.
 */
class FieldFactory {
	/**
	 * Returns the rendered field.
	 * @param string $type - the type of field: input, select, address-search. Any other will show a plain paragraph.
	 * @param string $id   - the field ID. Will also be used as form field name and as the option ID in database.
	 * @param array  $args - the extra parameters/arguments for the field creation: option, hints, default values, etc.
	 *
	 * @see \KST\WeatherStations\Admin\Fields\SettingFieldInterface
	 *
	 * @return SettingFieldInterface
	 */
	public static function create( string $id, string $type, array $args ): SettingFieldInterface {
		return match( $type ) {
			'input'          => new InputField( $id, $args ),
			'select'         => new SelectField( $id, $args ),
			'address-search' => new AddressSearchField( $id, $args ),
			default          => new class ( $id, $args ) extends  KSTAbstractField {
					public function render(): string {
						return '<p>' . $this->get_value( $this->args ) . '</p>';
					}
			}
		};
	}
}
