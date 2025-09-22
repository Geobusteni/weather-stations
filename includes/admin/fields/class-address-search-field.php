<?php
/**
 * A special case for the address field from Mapbox.
 * It will save both the address as well as the long/lat coordinates.
 *
 * @package kst-weather-stations
 */

declare(strict_types=1);

namespace KST\WeatherStations\Admin\Fields;

/**
 * This class is processing a special case text input field, for mapbox address geocoding.
 */
class AddressSearchField extends KSTAbstractField {

	public function render(): string {
		$args= [
			'id'    => $this->id,
			'name'  => $this->id,
			'value' => $this->get_value( $this->args ),
			'type'  => 'hidden',
		];

		if ( ! empty( $this->args['class'] ) ) {
			if ( is_array( $this->args['class'] ) ) {
				$args['class'] = implode( ' ', $this->args['class'] );
			} else {
				$args['class'] = $this->args['class'];
			}
		}

		$address_field = '<div class="row"><input ' . $this->process_attr( $args ) . '/>';
		$subfields     = [];

		// If it has subfields.
		if ( ! empty( $this->args['fields'] ) ) {
			foreach ( $this->args['fields'] as $key => $field ) {
				$sub_args = [
					'id'      => $this->id . '_' . $key,
					'name'    => $this->args['setting'] . '[' . $this->id . '_' . $key . ']',
					'class'   => ! empty( $field['class'] ) ? $field['class'] : '',
					'type'    => $field['type'],
					'setting' => $this->args['setting'],
				];

				// Get te database value for the subfield.
				$field['value'] = $this->get_value( $sub_args );

				foreach ( $sub_args as $sub_arg ) {
					if ( isset( $field[ $sub_arg ] ) ) {
						unset( $field[ $sub_arg ] );
					}
				}

				foreach ( $field as $subfield_key => $value ) {
					$sub_args[ $subfield_key ] = $value;
				}

				$subfield_html = '<input ' . $this->process_attr( $sub_args ) . '/>';

				if ( ! empty( $sub_args['label'] ) ) {
					$subfield_html = sprintf(
						'<label for="%s"><span>%s</span>%s</label>',
						\esc_attr( $sub_args['id'] ),
						$sub_args['label'] ,
						$subfield_html
					);
				}

				$subfields[] = $subfield_html;
			}
		}

		return \sprintf(
			'<fieldset class="kst-field-address-search">%s %s <div id="%s"></div><div id="%s"></div></fieldset>',
			$address_field,
			\implode('', $subfields),
			\esc_attr( 'mapbox-geocoder-' . $this->id ),
			\esc_attr( 'mapbox-render-' . $this->id )
		);
	}
}
