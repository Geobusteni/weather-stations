/* global KSTWeatherStations */
/**
 * WordPress deps.
 */
import { __ } from '@wordpress/i18n';

/**
 * Mapbox libs.
 */
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

// Making sure the language domain is set only once.
const domainLng = 'kst-weather-stations';

function reverseGeoCode(lng,lat, accessToken, field) {
    fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}`
    ).then(res => res.json())
    .then(data => {
        if (data.features && data.features.length > 0) {
            const address = data.features[0].place_name;
            let input = field.querySelector('input');

            const accessInput = setInterval(() => {
                if ( input ) {
                    input.value = address;
                    clearInterval( accessInput );
                } else {
                    input = field.querySelector('input');
                }
            }, 500);
        }
    });
}

document.addEventListener( 'DOMContentLoaded', () => {
    const container = document.getElementById( 'mapbox-render-mapbox-default-center' );
    const geocodeField = document.getElementById( 'mapbox-geocoder-mapbox-default-center' );
    const latHolder = container.closest('fieldset').querySelector( 'input[id*="-center_lat"]' );
    const lngHolder = container.closest('fieldset').querySelector( 'input[id*="-center_lng"]' );

    if ( ! container ) return;

    if (KSTWeatherStations.mapToken.length <= 0) {
        const warningTxt = __( 'Mapbox access token is required to get the address and render the map.',  domainLng );

        container.classList.add( 'warning' );
        container.innerHTML = warningTxt;

        return;
    }

    // Replace with your actual token (or localize from PHP)
    mapboxgl.accessToken = KSTWeatherStations.mapToken;

    // Get saved values from localized data
    const savedCenter = KSTWeatherStations?.defaultCenter || {};
    const savedZoom = parseInt(KSTWeatherStations?.zoom || 9, 10);
    const savedTheme = KSTWeatherStations?.theme === 'satellite' ? 'satellite-streets-v12' : 'streets-v12';

    // Initialize map with saved values if available
    const map = new mapboxgl.Map({
        container,
        style: `mapbox://styles/mapbox/${savedTheme}`,
        zoom: savedZoom,
        ...(savedCenter.lng && savedCenter.lat && {
            center: [parseFloat(savedCenter.lng), parseFloat(savedCenter.lat)]
        })
    });

    let defaultMarker= null;

    // Set initial field values from saved data
    if (savedCenter.lat && savedCenter.lng) {
        // Add marker for saved location
        defaultMarker = new mapboxgl.Marker()
            .setLngLat([parseFloat(savedCenter.lng), parseFloat(savedCenter.lat)])
            .addTo(map);

        // Always do reverse geocoding to get/update the address
        if (geocodeField) {
            reverseGeoCode(parseFloat(savedCenter.lng), parseFloat(savedCenter.lat), KSTWeatherStations.mapToken, geocodeField);
        }
    }

    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: "Search for an address",
        marker: true, // will place a marker at the result
    });

    geocoder.on('result', (result) => {
        // Update coordinates
        if (latHolder) {
            latHolder.value = result.result.center[1];
        }

        if (lngHolder) {
            lngHolder.value = result.result.center[0];
        }

        // Update address
        const input = geocodeField.querySelector('input');

        if (input) {
            input.value = result.result.place_name;
        }

        // Update marker
        if (defaultMarker) {
            defaultMarker.remove();
        }
        defaultMarker = new mapboxgl.Marker()
            .setLngLat(result.result.center)
            .addTo(map);

    }).on('clear', () => {
        if (defaultMarker) {
            defaultMarker.remove();
        }
    });

    geocodeField?.appendChild(geocoder.onAdd(map));

    // Optional: Add zoom & rotation controls
    map.addControl( new mapboxgl.NavigationControl() );
} );
