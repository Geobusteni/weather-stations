/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

const StationsList = ({ stations, onStationClick }) => {
    if (!stations.length) {
        return (
            <div className="weather-stations-list-empty">
                {__('No weather stations found.', 'kst-weather-stations')}
            </div>
        );
    }

    const handleStationWeatherData = (id) => {
        // Get me the weather data for the post.
        const weatherData = useSelect((select) => {
            return select('core').getEntityRecord('postType', 'weather_station', id);
        }, [id]);
        return weatherData;
    }

    return (
        <div className="weather-stations-list">
            <h3>{__('Weather Stations', 'kst-weather-stations')}</h3>
            <ul>
                {stations.map(station => (
                    <li key={station.id}>
                        <button
                            type="button"
                            onClick={() => onStationClick(station)}
                            className="weather-station-item"
                        >
                            <h4>{station.title}</h4>
                            {station.weather?.temp && (
                                <div className="weather-station-item-info">
                                    <span className="temperature">
                                        {station.weather.temp}°C
                                    </span>
                                    {station.weather.weather?.icon && (
                                        <img
                                            src={`https://openweathermap.org/img/w/${station.weather.weather.icon}.png`}
                                            alt={station.weather.weather.description}
                                            width="30"
                                            height="30"
                                        />
                                    )}
                                </div>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default StationsList;
