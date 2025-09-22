<?php
/**
 * Processing the admin select fields.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\Admin\Fields;

/**
 * Process each select field, returning the HTML.
 *
 * @see \KST\WeatherStations\Admin\Fields\KSTAbstractField
 */
class SelectField extends KSTAbstractField {
	public function render(): string {
		$args = [
			'id'    => $this->id,
		];

		if ( ! empty( $this->args['class'] ) ) {
			if ( is_array( $this->args['class'] ) ) {
				$args['class'] = implode( ' ', $this->args['class'] );
			} else {
				$args['class'] = $this->args['class'];
			}
		}

		foreach( $this->args as $name => $value ) {
			if ( is_array( $value ) ) {
				$value = implode( ' ', $value );
			}

			$args[ $name ] = $value;
		}

		$options = $this->args['options'] ?? [];

		if ( empty( $options ) ) {
			return '';
		}

		$select_html    = '';
		$default_option = '<option value="">' . \esc_html( $this->args['default_label'] ) . '</option>';

		foreach ( $options as $value => $label ) {
			$select_html .= \sprintf(
				'<option value="%s" %s>%s</option>',
				\esc_attr( $value ),
				\selected( $value, $this->get_value( $args ), false ),
				\esc_html( $label )
			);
		}

		return \sprintf(
			'<select %s> %s %s</select>',
			$this->process_attr( $args ),
			$default_option,
			$select_html
		);
	}

}
