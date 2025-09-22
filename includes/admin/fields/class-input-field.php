<?php
/**
 * Processing the fields.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\Admin\Fields;

/**
 * Processing each input field, one at a time and returns the HTML field.
 * Extends the abstract KST class for settings.
 *
 * @see \KST\WeatherStations\Admin\Fields\KSTAbstractField
 */
class InputField extends KSTAbstractField {
	public function render(): string {
		$attrs = [
			'id'    => $this->id,
			'name'  => $this->id,
			'type'  => $this->args['type'] ?? 'text',
		];

		unset( $this->args['value'] );
		unset( $this->args['type'] );

		foreach( $this->args as $name => $value ) {
			if ( is_array( $value ) ) {
				$value = implode( ' ', $value );
			}

			$attrs[ $name ] = $value;
		}

		return '<input ' . $this->process_attr( $attrs ) . ' value="' . \esc_attr( $this->get_value( $attrs ) ) . '" />';
	}
}
