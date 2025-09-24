/**
 * Weather station templates
 */

export const weatherConditions = ({ icon, main, description }) => `
    <div class="weather-conditions">
        ${icon ? `
            <img src="https://openweathermap.org/img/w/${icon}.png" 
                 alt="${description || ''}" />
        ` : ''}
        <div>
            <span>${main}</span>
            <small>${description}</small>
        </div>
    </div>
`;

export const weatherData = ({ temp, feelsLike, humidity, windSpeed, windDirection, unit, speedUnit }) => `
    <div class="weather-data">
        <div class="data-row">
            <strong>Temperature:</strong>
            <span>${temp}${unit}</span>
        </div>
        <div class="data-row feels-like">
            <strong>Feels like:</strong>
            <span>${feelsLike}${unit}</span>
        </div>
        <div class="data-row">
            <strong>Humidity:</strong>
            <span>${humidity}%</span>
        </div>
        <div class="data-row">
            <strong>Wind Speed:</strong>
            <span>${windSpeed} ${speedUnit}</span>
        </div>
        <div class="data-row">
            <strong>Wind Direction:</strong>
            <span>${windDirection}°</span>
        </div>
    </div>
`;

export const lastUpdate = (timestamp) => timestamp ? `
    <div class="last-update">
        <small>Last updated: ${new Date(timestamp).toLocaleString()}</small>
    </div>
` : '';

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
        <h4>${station.title}</h4>
        <p>${station.address}</p>
    </div>
`;
