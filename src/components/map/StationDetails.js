/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Button, ToggleControl } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { Icon, starEmpty, starFilled } from '@wordpress/icons';

const StationDetails = ({ station, onUnitChange }) => {
    const [unit, setUnit] = useState('celsius');
    const [isFavorite, setIsFavorite] = useState(false);

    // Check if station is in favorites on mount
    useEffect(() => {
        const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');
        setIsFavorite(favorites.includes(station.id));
    }, [station.id]);

    const toggleFavorite = () => {
        const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');
        let newFavorites;

        if (isFavorite) {
            newFavorites = favorites.filter(id => id !== station.id);
        } else {
            newFavorites = [...favorites, station.id];
        }

        localStorage.setItem('kst_favorite_stations', JSON.stringify(newFavorites));
        setIsFavorite(!isFavorite);
    };

    const toggleUnit = () => {
        const newUnit = unit === 'celsius' ? 'fahrenheit' : 'celsius';
        setUnit(newUnit);
        onUnitChange?.(newUnit);
    };

    const formatTemp = (temp) => {
        if (!temp) return '—';
        const value = unit === 'celsius' ? temp.celsius : temp.fahrenheit;
        return `${value}${unit === 'celsius' ? '°C' : '°F'}`;
    };

    const formatWind = (speed) => {
        if (!speed) return '—';
        const value = unit === 'celsius' ? speed.metric : speed.imperial;
        return `${value} ${unit === 'celsius' ? 'm/s' : 'mph'}`;
    };

    console.log(station);

    return (
        <div className="station-details">
            <div className="station-details-header">
                <Button
                    className="unit-toggle"
                    onClick={toggleUnit}
                    variant="secondary"
                    isSmall
                >
                    {unit === 'celsius' ? '°C' : '°F'}
                </Button>
                <Button
                    className="favorite-toggle"
                    onClick={toggleFavorite}
                    variant="secondary"
                    isSmall
                    icon={<Icon icon={isFavorite ? starFilled : starEmpty} />}
                    label={__('Toggle favorite', 'kst-weather-stations')}
                />
            </div>

            <h3>{station.title}</h3>
            <p className="station-address">{station.address}</p>

            {station.weather && (
                <div className="weather-info">
                    {station.weather.conditions && (
                        <div className="weather-conditions">
                            <img
                                src={`https://openweathermap.org/img/w/${station.weather.conditions.icon}.png`}
                                alt={station.weather.conditions.description}
                            />
                            <span>{station.weather.conditions.main}</span>
                            <small>{station.weather.conditions.description}</small>
                        </div>
                    )}

                    <div className="weather-data">
                        <div className="data-row">
                            <strong>{__('Temperature:', 'kst-weather-stations')}</strong>
                            <span>{formatTemp(station.weather.temperature)}</span>
                        </div>
                        <div className="data-row feels-like">
                            <strong>{__('Feels like:', 'kst-weather-stations')}</strong>
                            <span>{formatTemp(station.weather.feelsLike)}</span>
                        </div>
                        <div className="data-row">
                            <strong>{__('Humidity:', 'kst-weather-stations')}</strong>
                            <span>{station.weather.humidity}%</span>
                        </div>
                        <div className="data-row">
                            <strong>{__('Wind:', 'kst-weather-stations')}</strong>
                            <span>{formatWind(station.weather.windSpeed)}</span>
                        </div>
                        <div className="data-row">
                            <strong>{__('Wind Direction:', 'kst-weather-stations')}</strong>
                            <span>{station.weather.windDirection}&deg;</span>
                        </div>
                    </div>

                    {station.weather.lastUpdate && (
                        <div className="last-update">
                            <small>
                                {__('Last updated:', 'kst-weather-stations')}{' '}
                                {new Date(station.weather.lastUpdate).toLocaleString()}
                            </small>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StationDetails;
