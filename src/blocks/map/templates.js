import {__} from '@wordpress/i18n';
/**
 * Weather station templates
 */
export const weatherConditions = ({ icon, main, description }) => {
    const title = __('Weather:', 'weather-stations-map');
   return ` <div class="weather-conditions">
        <div>
            <strong>${title}</strong>
            <span>${main} - ${description}</span>
        </div>
    </div>`
};

export const weatherData = ({ temp, feelsLike, humidity, windSpeed, windDirection, unit, speedUnit }) => {
    const tempTitle = __('Temperature:', 'weather-stations-map');
    const humidityTitle = __('Humidity:', 'weather-stations-map');
    const windTitle = __('Wind:', 'weather-stations-map');

    return `<div class="weather-data">
        <div class="data-row">
            <strong>${tempTitle}</strong>
            <span>${temp} - ${feelsLike}${unit}</span>
        </div>
        <div class="data-row">
            <strong>${humidityTitle}</strong>
            <span>${humidity}%</span>
        </div>
        <div class="data-row">
            <strong>${windTitle}</strong>
            <span>${windSpeed} ${speedUnit} | ${windDirection}°</span>
        </div>
    </div>`;
}

export const lastUpdate = (timestamp) => {
    if ( !timestamp ) return '';
    const title = __('Last update:', 'weather-stations-map');
    return `<div class="last-update">
        <small>${title} ${new Date(timestamp).toLocaleString()}</small>
    </div>`
};

export const weatherTemplate = (weather, unit) => {
    const temp = unit === 'celsius' ? weather.temperature.celsius : weather.temperature.fahrenheit;
    const feelsLike = unit === 'celsius' ? weather.feelsLike.celsius : weather.feelsLike.fahrenheit;
    const windSpeed = unit === 'celsius' ? weather.windSpeed.metric : weather.windSpeed.imperial;
    const speedUnit = unit === 'celsius' ? 'm/s' : 'mph';

    return `
        ${weatherConditions(weather.conditions)}
        ${weatherData({
            temp,
            feelsLike,
            humidity: weather.humidity,
            windSpeed,
            windDirection: weather.windDirection,
            unit: unit === 'celsius' ? '°C' : '°F',
            speedUnit
        })}
        ${lastUpdate(weather.lastUpdate)}
    `;
};

export const savedStationTemplate = (station) => `
    <div class="saved-station-item" data-id="${station.id}">
        <h3 class="station-name">${station.title}</h3>
        <p class="station-address">${station.address}</p>
    </div>
`;
