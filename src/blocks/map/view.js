/**
 * WordPress dependencies
 */
import { render } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';

/**
 * Internal dependencies
 */
import Map from '../../components/map/Map';
import '../../components/map/style.scss';

domReady(() => {
    const mapContainers = document.querySelectorAll('.weather-stations-map');

    mapContainers.forEach(container => {
        // Get map settings from data attributes
        const token = container.dataset.token;
        const centerLat = parseFloat(container.dataset.centerLat) || 44.4268;
        const centerLng = parseFloat(container.dataset.centerLng) || 26.1025;
        const zoom = parseInt(container.dataset.zoom) || 16;
        const theme = container.dataset.theme;
        const stationIds = container.dataset.stations ? container.dataset.stations.split(',') : [];

        if (!token) {
            console.error('Mapbox token not configured');
            return;
        }

        // Fetch stations data
        if (stationIds.length > 0) {
            Promise.all(stationIds.map(id => 
                fetch(`/wp-json/wp/v2/weather-station/${id}`)
                    .then(response => response.json())
            ))
            .then(stations => {
                const stationsData = stations.map(station => ({
                    id: station.id,
                    title: station.title.rendered,
                    lat: parseFloat(station.meta._kst_ws_latitude),
                    lng: parseFloat(station.meta._kst_ws_longitude),
                    weather: station.meta._kst_ws_weather_data,
                    lastUpdate: station.meta._kst_ws_last_update,
                }));

                // Replace container with our React component
                const wrapper = document.createElement('div');
                container.parentNode.replaceChild(wrapper, container);

                render(
                    <Map
                        token={token}
                        center={[centerLng, centerLat]}
                        zoom={zoom}
                        theme={theme}
                        stations={stationsData}
                        showSidebar={true}
                    />,
                    wrapper
                );
            })
            .catch(error => {
                console.error('Error fetching weather stations:', error);
            });
        }
    });
});