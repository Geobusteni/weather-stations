/**
 * External dependencies
 */
import mapboxgl from 'mapbox-gl';

/**
 * Internal dependencies
 */
import { weatherTemplate, savedStationTemplate } from './templates';

// SVG icon for the marker
const markerSvg = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
</svg>
`;

class WeatherStationsMap {
    constructor(container, settings, stations) {
        this.container = container;
        this.settings = settings;
        this.stations = stations;
        this.markers = {};
        this.currentUnit = 'celsius';
        this.activeStation = null;

        // Find UI elements
        this.wrapper = container.closest('.weather-stations-map-wrapper');
        this.sidebar = this.wrapper.querySelector('.weather-stations-sidebar');
        this.weatherInfo = this.wrapper.querySelector('.weather-info');
        this.savedStations = this.wrapper.querySelector('.saved-stations');
        this.savedStationsList = this.wrapper.querySelector('.saved-stations-list');

        // Initialize map
        this.initMap();
        this.initControls();
        this.initOverlay();
    }

    initMap() {
        const { token, centerLat, centerLng, zoom, theme } = this.settings;
        mapboxgl.accessToken = token;

        this.map = new mapboxgl.Map({
            container: this.container,
            style: `mapbox://styles/mapbox/${theme === 'satellite' ? 'satellite-streets-v12' : 'streets-v12'}`,
            center: [centerLng, centerLat],
            zoom: zoom,
            scrollZoom: false,
        });

        this.map.addControl(new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true
        }));

        // Add markers and fit bounds
        this.addMarkersAndFitBounds();
    }

    addMarkersAndFitBounds() {
        const bounds = new mapboxgl.LngLatBounds();
        const { centerLat, centerLng } = this.settings;

        // Add default center to bounds
        if (centerLng && centerLat) {
            bounds.extend([centerLng, centerLat]);
        }

        // Get favorites from localStorage
        const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');

        this.stations.forEach(station => {
            const { id, lat, lng } = station;
            if (!lat || !lng) return;

            // Add to bounds
            bounds.extend([lng, lat]);

            // Create marker
            const el = document.createElement('div');
            el.className = `weather-station-marker${favorites.includes(id) ? ' is-favorite' : ''}`;
            el.innerHTML = markerSvg;

            // Add click handler
            el.addEventListener('click', () => this.showStationDetails(station));

            // Add marker to map
            this.markers[id] = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(this.map);
        });

        // Fit bounds if we have points
        if (!bounds.isEmpty()) {
            this.map.fitBounds(bounds, {
                padding: 50,
                maxZoom: this.settings.zoom || 16
            });
        }
    }

    initControls() {
        // Unit toggles
        const unitToggles = this.wrapper.querySelectorAll('.unit-toggle');
        unitToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const unit = toggle.dataset.unit;
                if (unit === this.currentUnit) return;

                // Update active class
                unitToggles.forEach(btn => btn.classList.remove('active'));
                toggle.classList.add('active');

                // Update unit and refresh display
                this.currentUnit = unit;
                if (this.activeStation) {
                    this.showStationDetails(this.activeStation, this.wrapper.classList.contains('show-saved'));
                }
            });
        });

        // Save station button
        const saveButton = this.wrapper.querySelector('.save-station-button');

        saveButton.addEventListener('click', () => {
            if (!this.activeStation) return;

            const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');
            const isFavorite = favorites.includes(this.activeStation.id);

            if (isFavorite) {
                // Remove from favorites
                const newFavorites = favorites.filter(id => id !== this.activeStation.id);
                localStorage.setItem('kst_favorite_stations', JSON.stringify(newFavorites));
                saveButton.classList.remove('saved');

                // Hide My Locations button if no more favorites
                if (newFavorites.length === 0) {
                    this.wrapper.querySelector('.my-locations-button').classList.remove('active');
                }
            } else {
                // Add to favorites
                favorites.push(this.activeStation.id);
                localStorage.setItem('kst_favorite_stations', JSON.stringify(favorites));
                saveButton.classList.add('saved');

                // Show My Locations button
                this.wrapper.querySelector('.my-locations-button').classList.add('active');
            }

            // Trigger storage event for marker updates
            window.dispatchEvent(new Event('storage'));
        });

        // My Locations button
        const myLocationsButton = this.wrapper.querySelector('.my-locations-button');

        myLocationsButton.addEventListener('click', () => {
            myLocationsButton.classList.remove('active');
            this.showSavedStations();
        });

        // Close saved stations button
        const closeButton = this.wrapper.querySelector('.close-saved-button');

        closeButton.addEventListener('click', () => {
            this.hideSavedStations();
        });

        // Handle favorites changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'kst_favorite_stations') {
                this.updateMarkerFavorites(JSON.parse(e.newValue || '[]'));
            }
        });
    }

    initOverlay() {
        const overlay = this.wrapper.querySelector('.weather-station-overlay');
        if (!overlay) return;

        let hasFaded = false;
        const fadeHeight = 500; // Height at which overlay starts to fade

        const handleScroll = () => {
            if (hasFaded) return;

            requestAnimationFrame(() => {
                const scrollTop = this.wrapper.scrollTop;
                if (scrollTop >= fadeHeight) {
                    hasFaded = true;
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 0.3s ease-out';

                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, 300);
                }
            });
        };

        this.wrapper.addEventListener('scroll', handleScroll, { passive: true });
    }

    showStationDetails(station, fromSavedView = false) {
        this.activeStation = station;

        // If not coming from saved view, hide saved stations and show normal view
        if (!fromSavedView) {
            this.wrapper.classList.remove('show-saved');
            this.container.style.display = 'block';
            this.savedStations.style.display = 'none';
            this.weatherInfo.style.display = 'block';
        }

        // Update save button and My Locations button state
        const saveButton = this.wrapper.querySelector('.save-station-button');
        const myLocationsButton = this.wrapper.querySelector('.my-locations-button');
        const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');

        // Update save button state
        if (favorites.includes(station.id)) {
            saveButton.classList.add('saved');
        } else {
            saveButton.classList.remove('saved');
        }

        // Update My Locations button state
        if (favorites.length > 0) {
            myLocationsButton.classList.add('active');
        } else {
            myLocationsButton.classList.remove('active');
        }

        // Update weather data
        const weatherData = this.formatWeatherData(station.weather);

        if (fromSavedView) {
            // In saved view, update the station item to include weather data
            const stationItem = this.savedStationsList.querySelector(`[data-id="${station.id}"]`);
            if (stationItem) {
                // If there's already weather info, remove it
                const existingWeatherInfo = stationItem.querySelector('.weather-info');
                if (existingWeatherInfo) {
                    existingWeatherInfo.remove();
                }

                // Add weather info
                const weatherInfo = document.createElement('div');
                weatherInfo.className = 'weather-info';
                weatherInfo.innerHTML = weatherData;
                stationItem.appendChild(weatherInfo);

                // Add active class to this item, remove from others
                this.savedStationsList.querySelectorAll('.saved-station-item').forEach(item => {
                    item.classList.remove('active');
                });
                stationItem.classList.add('active');
            }

            // Show map but keep saved view active
            this.container.style.display = 'block';
        } else {
            // In normal view, update the weather info section
            this.weatherInfo.querySelector('.station-name').textContent = station.title;
            this.weatherInfo.querySelector('.station-address').textContent = station.address;
            this.weatherInfo.querySelector('.weather-data').innerHTML = weatherData;
        }

        // Center map on station
        this.map.panTo([station.lng, station.lat]);
    }

    showSavedStations() {
        const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');
        const savedStations = this.stations.filter(station => favorites.includes(station.id));

        this.savedStationsList.innerHTML = savedStations.map(savedStationTemplate).join('');

        // Add click handlers
        this.savedStationsList.querySelectorAll('.saved-station-item').forEach(item => {
            item.addEventListener('click', () => {
                const station = this.stations.find(s => s.id === parseInt(item.dataset.id));
                if (station) {
                    this.showStationDetails(station, true);
                }
            });
        });

        this.wrapper.classList.add('show-saved');
        this.weatherInfo.style.display = 'none';
        this.savedStations.style.display = 'block';

        // Keep map visible but adjust layout with CSS
        this.container.style.display = 'block';
    }

    hideSavedStations() {
        // Reset UI classes
        this.wrapper.classList.remove('show-saved');
        this.container.style.display = 'block';
        this.savedStations.style.display = 'none';
        this.weatherInfo.style.display = 'none';

        // Reset button states
        this.wrapper.querySelector('.save-station-button').classList.remove('saved');
        this.wrapper.querySelector('.my-locations-button').classList.remove('active');

        // Clear active station
        this.activeStation = null;

        // Clear saved stations list
        this.savedStationsList.innerHTML = '';

        // Create bounds that will include all stations and default center
        const bounds = new mapboxgl.LngLatBounds();
        const { centerLat, centerLng, zoom } = this.settings;

        // Add default center to bounds
        if (centerLng && centerLat) {
            bounds.extend([centerLng, centerLat]);
        }

        // Add all stations to bounds
        this.stations.forEach(station => {
            if (station.lat && station.lng) {
                bounds.extend([station.lng, station.lat]);
            }
        });

        // Fit map to bounds if we have any points
        if (!bounds.isEmpty()) {
            this.map.fitBounds(bounds, {
                padding: 50,
                maxZoom: zoom || 16, // Use provided zoom as maximum, or default to 16
                duration: 1000 // smooth animation
            });
        }
    }

    updateMarkerFavorites(favorites) {
        Object.entries(this.markers).forEach(([id, marker]) => {
            const el = marker.getElement();
            el.className = `weather-station-marker${favorites.includes(parseInt(id)) ? ' is-favorite' : ''}`;
        });
    }

    formatWeatherData(weather) {
        if (!weather) return '';
        return weatherTemplate(weather, this.currentUnit);
    }
}

// Initialize maps when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
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

                // Initialize map
                new WeatherStationsMap(container, {
                    token,
                    centerLat,
                    centerLng,
                    zoom,
                    theme
                }, stationsData);
            })
            .catch(error => {
                console.error('Error fetching weather stations:', error);
            });
        }
    });
});
