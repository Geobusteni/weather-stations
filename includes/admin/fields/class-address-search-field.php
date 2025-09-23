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
        // Get current values
        $current_value = $this->args['value'] ?? [];
        $address = $current_value['address'] ?? '';
        $lat = $current_value['lat'] ?? '';
        $lng = $current_value['lng'] ?? '';

        // Create address search input
        $search_args = [
            'type' => 'text',
            'id' => $this->id . '_search',
            'class' => 'regular-text',
            'placeholder' => \__('Search for an address...', 'kst-weather-stations'),
        ];

        // Create hidden fields for actual data
        $address_args = [
            'type' => 'hidden',
            'id' => $this->id . '_address',
            'name' => $this->args['setting'] . '[' . $this->id . '][address]',
            'value' => $address,
        ];

        $lat_args = [
            'type' => 'text',
            'id' => $this->id . '_lat',
            'name' => $this->args['setting'] . '[' . $this->id . '][lat]',
            'value' => $lat,
            'class' => 'small-text',
            'readonly' => 'readonly',
        ];

        $lng_args = [
            'type' => 'text',
            'id' => $this->id . '_lng',
            'name' => $this->args['setting'] . '[' . $this->id . '][lng]',
            'value' => $lng,
            'class' => 'small-text',
            'readonly' => 'readonly',
        ];

        // Build the field HTML
        $html = '<fieldset class="kst-field-address-search">';
        
        // Geocoder container
        $html .= \sprintf(
            '<div class="geocoder-container" id="%s"></div>',
            \esc_attr('mapbox-geocoder-' . $this->id)
        );

        // Hidden address field
        $html .= '<input ' . $this->process_attr($address_args) . '/>';

        // Coordinates group
        $html .= '<div class="coordinates-group">';
        $html .= \sprintf(
            '<label><span>%s</span><input %s/></label>',
            \__('Latitude', 'kst-weather-stations'),
            $this->process_attr($lat_args)
        );
        $html .= \sprintf(
            '<label><span>%s</span><input %s/></label>',
            \__('Longitude', 'kst-weather-stations'),
            $this->process_attr($lng_args)
        );
        $html .= '</div>';

        // Map container
        $html .= \sprintf(
            '<div class="map-container" id="%s"></div>',
            \esc_attr('mapbox-render-' . $this->id)
        );

        $html .= '</fieldset>';

        return $html;
    }
}