/**
 * WordPress dependencies
 */
import domReady from '@wordpress/dom-ready';

domReady(() => {
    const mapContainers = document.querySelectorAll('.weather-stations-map');

    mapContainers.forEach(container => {
        // Get map settings from data attributes
        const token = container.dataset.token;
        const centerLat = parseFloat(container.dataset.centerLat) || 44.4268; // Default to Bucharest
        const centerLng = parseFloat(container.dataset.centerLng) || 26.1025;
        const zoom = parseInt(container.dataset.zoom) || 16;
        const theme = container.dataset.theme === 'satellite' ? 'satellite-streets-v12' : 'streets-v12';
        const stationIds = container.dataset.stations ? container.dataset.stations.split(',') : [];

        if (!token) {
            console.error('Mapbox token not configured');
            return;
        }

        // Initialize map
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
            container,
            style: `mapbox://styles/mapbox/${theme}`,
            center: [centerLng, centerLat],
            zoom: zoom,
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // Fetch stations data
        if (stationIds.length > 0) {
            Promise.all(stationIds.map(id => 
                fetch(`/wp-json/wp/v2/weather-station/${id}`)
                    .then(response => response.json())
            ))
            .then(stations => {
                stations.forEach(station => {
                    const lat = parseFloat(station.meta._kst_ws_latitude);
                    const lng = parseFloat(station.meta._kst_ws_longitude);
                    const weather = station.meta._kst_ws_weather_data || {};
                    const lastUpdate = station.meta._kst_ws_last_update;

                    if (!lat || !lng) return;

                    // Create marker element
                    const el = document.createElement('div');
                    el.className = 'weather-station-marker';
                    el.innerHTML = '<span class="dashicons dashicons-location"></span>';

                    // Create popup
                    const popup = new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="weather-station-popup">
                                <h3>${station.title.rendered}</h3>
                                ${weather.temp ? `
                                    <div class="weather-info">
                                        <p><strong>Temperature:</strong> ${weather.temp}°C</p>
                                        <p><strong>Humidity:</strong> ${weather.humidity}%</p>
                                        <p><strong>Wind:</strong> ${weather.wind_speed} m/s</p>
                                        ${weather.weather ? `
                                            <p><strong>Conditions:</strong> ${weather.weather.description}</p>
                                            <img src="https://openweathermap.org/img/w/${weather.weather.icon}.png" alt="${weather.weather.description}">
                                        ` : ''}
                                    </div>
                                    <div class="weather-update">
                                        <small>Last updated: ${new Date(lastUpdate).toLocaleString()}</small>
                                    </div>
                                ` : '<p>No weather data available</p>'}
                            </div>
                        `);

                    // Add marker to map
                    new mapboxgl.Marker(el)
                        .setLngLat([lng, lat])
                        .setPopup(popup)
                        .addTo(map);
                });

                // Fit map to markers if we have stations
                if (stations.length > 0) {
                    const bounds = new mapboxgl.LngLatBounds();
                    stations.forEach(station => {
                        const lat = parseFloat(station.meta._kst_ws_latitude);
                        const lng = parseFloat(station.meta._kst_ws_longitude);
                        if (lat && lng) {
                            bounds.extend([lng, lat]);
                        }
                    });
                    map.fitBounds(bounds, { padding: 50 });
                }
            })
            .catch(error => {
                console.error('Error fetching weather stations:', error);
            });
        }
    });
});