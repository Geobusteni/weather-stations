/**
 * WordPress dependencies
 */
import { render } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';

/**
 * External dependencies
 */
import mapboxgl from 'mapbox-gl';

/**
 * Internal dependencies
 */
import StationDetails from '../../components/map/StationDetails';
import SavedLocations from '../../components/map/SavedLocations';

const WeatherStationsMap = ({ container, settings, stations }) => {
    const { token, centerLat, centerLng, zoom, theme } = settings;

    // Initialize map
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
        container,
        style: `mapbox://styles/mapbox/${theme === 'satellite' ? 'satellite-streets-v12' : 'streets-v12'}`,
        center: [centerLng, centerLat],
        zoom: zoom,
        scrollZoom: false, // Disable scroll zooming
    });

    // Add navigation controls with all controls enabled
    map.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
    }));

    // Create bounds that will include all stations and default center
    const bounds = new mapboxgl.LngLatBounds();

    // Add default center to bounds
    if (centerLng && centerLat) {
        bounds.extend([centerLng, centerLat]);
    }

    // Add all stations to bounds
    stations.forEach(station => {
        if (station.lat && station.lng) {
            bounds.extend([station.lng, station.lat]);
        }
    });

    // Fit map to bounds if we have any points
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
            padding: 50,
            maxZoom: zoom || 16 // Use provided zoom as maximum, or default to 16
        });
    }

    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.className = 'weather-stations-list';
    container.parentNode.insertBefore(sidebarContainer, container);

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'weather-stations-map-wrapper';
    container.parentNode.insertBefore(wrapper, container);
    wrapper.appendChild(sidebarContainer);
    wrapper.appendChild(container);

    // Add markers for stations
    const markers = {};
    const popups = {};
    const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');

    stations.forEach(station => {
        const { id, lat, lng } = station;
        if (!lat || !lng) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = `weather-station-marker${favorites.includes(id) ? ' is-favorite' : ''}`;
        el.innerHTML = '<span class="dashicons dashicons-location"></span>';

        // Create marker
        markers[id] = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(map);

        // Create popup
        popups[id] = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false,
        })
            .setHTML(`<h3>${station.title}</h3>`);

        // Show popup on hover
        el.addEventListener('mouseenter', () => {
            popups[id].addTo(map);
        });

        el.addEventListener('mouseleave', () => {
            popups[id].remove();
        });

        // Function to show station details
        const showStationDetails = (selectedStation) => {
            render(
                <StationDetails
                    station={selectedStation}
                    onUnitChange={() => {
                        // Re-render with new unit
                        showStationDetails(selectedStation);
                    }}
                    onShowSaved={() => {
                        // Show saved locations
                        render(
                            <SavedLocations
                                stations={stations}
                                onStationSelect={(station) => {
                                    showStationDetails(station);
                                    map.panTo([station.lng, station.lat]);
                                }}
                                onBack={() => showStationDetails(selectedStation)}
                            />,
                            sidebarContainer
                        );
                    }}
                />,
                sidebarContainer
            );
        };

        // Show station details on click
        el.addEventListener('click', () => {
            showStationDetails(station);

            // Just pan to the station, keeping current zoom level
            map.panTo([lng, lat]);
        });
    });

    // Map is already fitted to bounds including default center and all stations

    // Update markers when favorites change
    window.addEventListener('storage', (e) => {
        if (e.key === 'kst_favorite_stations') {
            const newFavorites = JSON.parse(e.newValue || '[]');
            stations.forEach(({ id }) => {
                const marker = markers[id];
                if (marker) {
                    const el = marker.getElement();
                    el.className = `weather-station-marker${newFavorites.includes(id) ? ' is-favorite' : ''}`;
                }
            });
        }
    });
};

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
                    address: station.meta._kst_ws_address,
                    lat: parseFloat(station.meta._kst_ws_latitude),
                    lng: parseFloat(station.meta._kst_ws_longitude),
                    weather: {
                        conditions: station.meta._kst_ws_weather_data.metric?.weather,
                        temperature: {
                            celsius: station.meta._kst_ws_weather_data?.metric?.temp,
                            fahrenheit: station.meta._kst_ws_weather_data?.imperial?.temp,
                        },
                        feelsLike: {
                            celsius: station.meta._kst_ws_weather_data?.metric?.feels_like,
                            fahrenheit: station.meta._kst_ws_weather_data?.imperial?.feels_like,
                        },
                        humidity: station.meta._kst_ws_weather_data?.metric?.humidity,
                        windSpeed: {
                            metric: station.meta._kst_ws_weather_data?.metric?.wind_speed,
                            imperial: station.meta._kst_ws_weather_data?.imperial?.wind_speed,
                        },
                        windDirection: station.meta._kst_ws_weather_data.metric.wind_deg,
                        lastUpdate: station.meta._kst_ws_last_update,
                    },
                }));

                // Initialize map component
                WeatherStationsMap({
                    container,
                    settings: { token, centerLat, centerLng, zoom, theme },
                    stations: stationsData,
                });
            })
            .catch(error => {
                console.error('Error fetching weather stations:', error);
            });
        }
    });
});
