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
import defaultMarker from "@mapbox/mapbox-gl-geocoder";

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

    const map = new mapboxgl.Map( {
        container,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [ 26.1025, 44.4268 ], // lng, lat (Bucharest example)
        zoom: 10,
    } );

    let defaultMarker= null;

    if ( latHolder.value.length > 0  && lngHolder.value.length > 0  ) {
        const defaultMarker = new mapboxgl.Marker().setLngLat([parseFloat(lngHolder.value), parseFloat(latHolder.value)]);
        defaultMarker.addTo(map);

        map.setCenter([parseFloat(lngHolder.value), parseFloat(latHolder.value)]);

        if(geocodeField) {
            reverseGeoCode(parseFloat(lngHolder.value), parseFloat(latHolder.value), KSTWeatherStations.mapToken, geocodeField);
        }
    }

    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: "Search for an address",
        marker: true, // will place a marker at the result
    });

    geocoder.on('result', (result) => {
        if (latHolder) {
            latHolder.value = result.result.center[1];
        }

        if (lngHolder) {
            lngHolder.value = result.result.center[0];
        }

    }).on('clear', () => {
        if (defaultMarker) {
            defaultMarker.remove();
        }
    });

    geocodeField?.appendChild(geocoder.onAdd(map));

    // Optional: Add zoom & rotation controls
    map.addControl( new mapboxgl.NavigationControl() );
} );
