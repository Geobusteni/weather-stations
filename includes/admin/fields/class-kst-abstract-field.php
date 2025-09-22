<?php
/**
 * Class used for the settings page.
 *
 * @package kst-weather-stations
 */

namespace KST\WeatherStations\Admin\Fields;

/**
 * Abstracts the methods used to render the fields.
 * Implements the rendering interface to return a string.
 *
 * @see \KST\WeatherStations\Admin\Fields\SettingFieldInterface
 */
abstract class KSTAbstractField implements SettingFieldInterface {
	/**
	 * The id of the field.
	 * It will be used also as the name of the field and option ID inside the database.
	 *
	 * @var string
	 */
	protected string $id;

	/**
	 * The field arguments. This is an array where we define the values that the field can have.
	 *
	 * @var array
	 */
	protected array $args;

	/**
	 * Make sure to feed the ID and the arguments to the class.
	 *
	 * @param string $id
	 * @param array $args
	 */
	public function __construct( string $id, array $args ) {
		$this->id   = $id;
		$this->args = $args;
	}

	/**
	 * Getting the field value from the options table.
	 *
	 * @param mixed $default The default value of the field.
	 *
	 * @return
	 */
	public function get_value( array $attributes ): mixed {
		// Get the database value/
		$db_value = isset( $attributes['setting'] )  ? \get_option( $attributes['setting'] ) : [];

		if ( empty( $db_value ) ) {
			return ! empty( $default_value ) ? $default_value : '';
		}

		if ( ! isset( $attributes['id'] ) || ! isset( $db_value[ $attributes['id'] ] ) ) {
			return ! empty( $default_value ) ? $default_value : '';
		}

		return $db_value[ $attributes['id'] ];
	}

	/**
	 * Processing the field attributes and returning them as an array.
	 *
	 * @param array $attributes
	 *
	 * @return string
	 */
	public function process_attr( array $attributes ): string {
		if ( empty( $attributes ) ) {
			return '';
		}

		$new_attr = [];

		if ( ! empty( $attributes[ 'setting' ] ) && ! empty( $attributes[ 'id' ] ) ) {
			$attributes['name'] = $attributes['setting'] . '[' . $attributes['id'] . ']';
			$attributes['id']   = $attributes['setting'] . '-' . $attributes['id'];
		}

		unset( $attributes['setting'] );

		foreach ( $attributes as $key => $value ) {
			if ( empty( $value ) ) {
				continue;
			}

			if ( 'hint' === $key ) {
				continue;
			}

			$new_attr[] = $key . '="' . $value . '"';
		}

		return implode( ' ', $new_attr );
	}
}
