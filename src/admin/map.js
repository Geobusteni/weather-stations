/**
 * WordPress dependencies
 */
import { render } from '@wordpress/element';

/**
 * External dependencies
 */
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

/**
 * Initialize admin map
 */
const initAdminMap = () => {
    // Find all map containers (we might have multiple address fields)
    const containers = document.querySelectorAll('[id^="mapbox-render-"]');
    
    containers.forEach(container => {
        const fieldId = container.id.replace('mapbox-render-', '');
        const fieldset = container.closest('.kst-field-address-search');
        
        if (!fieldset) return;

        // Get input fields
        const addressInput = fieldset.querySelector(`input[name$="[${fieldId}][address]"]`);
        const latInput = fieldset.querySelector(`input[name$="[${fieldId}][lat]"]`);
        const lngInput = fieldset.querySelector(`input[name$="[${fieldId}][lng]"]`);
        const token = KSTWeatherStations?.mapToken;

        if (!token || !addressInput || !latInput || !lngInput) {
            console.error('Missing required elements for map:', fieldId);
            return;
        }

        // Get initial coordinates
        const lat = parseFloat(latInput.value) || 44.4268; // Default to Bucharest
        const lng = parseFloat(lngInput.value) || 26.1025;

        // Initialize map
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
            container,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: 13,
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // Create marker
        const marker = new mapboxgl.Marker({
            draggable: true,
            color: '#e74c3c',
        })
            .setLngLat([lng, lat])
            .addTo(map);

        // Update coordinates when marker is dragged
        marker.on('dragend', () => {
            const { lng, lat } = marker.getLngLat();
            latInput.value = lat.toFixed(6);
            lngInput.value = lng.toFixed(6);
            
            // Trigger change events
            latInput.dispatchEvent(new Event('change', { bubbles: true }));
            lngInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Reverse geocode to get address
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}`)
                .then(response => response.json())
                .then(data => {
                    if (data.features?.length > 0) {
                        addressInput.value = data.features[0].place_name;
                        addressInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                })
                .catch(error => console.error('Reverse geocoding failed:', error));
        });

        // Update marker when coordinates change
        const updateMarker = () => {
            const newLat = parseFloat(latInput.value);
            const newLng = parseFloat(lngInput.value);
            
            if (newLat && newLng) {
                marker.setLngLat([newLng, newLat]);
                map.flyTo({ center: [newLng, newLat], zoom: 13 });
            }
        };

        latInput.addEventListener('change', updateMarker);
        lngInput.addEventListener('change', updateMarker);

        // Initialize geocoder
        const geocoderContainer = document.getElementById(`mapbox-geocoder-${fieldId}`);
        if (geocoderContainer) {
            const geocoder = new MapboxGeocoder({
                accessToken: token,
                mapboxgl,
                marker: false,
            });

            geocoder.addTo(geocoderContainer);

            // Handle geocoder result
            geocoder.on('result', (e) => {
                const [lng, lat] = e.result.center;
                
                // Update inputs
                addressInput.value = e.result.place_name;
                latInput.value = lat.toFixed(6);
                lngInput.value = lng.toFixed(6);

                // Update marker and map
                marker.setLngLat([lng, lat]);
                map.flyTo({ center: [lng, lat], zoom: 13 });

                // Trigger change events
                addressInput.dispatchEvent(new Event('change', { bubbles: true }));
                latInput.dispatchEvent(new Event('change', { bubbles: true }));
                lngInput.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Set initial value if we have one
            if (addressInput.value) {
                geocoder.setInput(addressInput.value);
            }
        }
    });
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdminMap);