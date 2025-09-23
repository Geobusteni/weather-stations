/**
 * External dependencies
 */
import mapboxgl from 'mapbox-gl';

class Pin {
    constructor({ map, coordinates, title, weather, lastUpdate, onClick }) {
        this.map = map;
        this.coordinates = coordinates;
        this.title = title;
        this.weather = weather;
        this.lastUpdate = lastUpdate;
        this.onClick = onClick;

        this.createMarker();
        this.createPopup();
        this.addToMap();
    }

    createMarker() {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'weather-station-marker';
        el.innerHTML = '<span class="dashicons dashicons-location"></span>';
        
        // Add click handler
        el.addEventListener('click', () => {
            this.onClick?.();
            this.showPopup();
        });

        this.marker = new mapboxgl.Marker(el)
            .setLngLat(this.coordinates);
    }

    createPopup() {
        this.popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
                <div class="weather-station-popup">
                    <h3>${this.title}</h3>
                    ${this.weather?.temp ? `
                        <div class="weather-info">
                            <p><strong>Temperature:</strong> ${this.weather.temp}°C</p>
                            <p><strong>Humidity:</strong> ${this.weather.humidity}%</p>
                            <p><strong>Wind:</strong> ${this.weather.wind_speed} m/s</p>
                            ${this.weather.weather ? `
                                <p><strong>Conditions:</strong> ${this.weather.weather.description}</p>
                                <img src="https://openweathermap.org/img/w/${this.weather.weather.icon}.png" alt="${this.weather.weather.description}">
                            ` : ''}
                        </div>
                        <div class="weather-update">
                            <small>Last updated: ${new Date(this.lastUpdate).toLocaleString()}</small>
                        </div>
                    ` : '<p>No weather data available</p>'}
                </div>
            `);
    }

    addToMap() {
        this.marker
            .setPopup(this.popup)
            .addTo(this.map);
    }

    showPopup() {
        this.popup.addTo(this.map);
    }

    remove() {
        this.marker.remove();
    }
}

export default Pin;