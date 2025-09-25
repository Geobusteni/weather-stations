/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { store as coreStore } from '@wordpress/core-data';
import { useState, useMemo } from '@wordpress/element';
import { Button, Spinner } from '@wordpress/components';

/**
 * Helpers
 */
const normalizeWeatherData = (rawData) => {
    if (!rawData?.metric || !rawData?.imperial) {
        return null;
    }

    return {
        conditions: {
            main: rawData.metric.weather?.main,
            description: rawData.metric.weather?.description,
            icon: rawData.metric.weather?.icon,
        },
        temperature: {
            celsius: rawData.metric.temp,
            fahrenheit: rawData.imperial.temp,
        },
        feelsLike: {
            celsius: rawData.metric.feels_like,
            fahrenheit: rawData.metric.feels_like,
        },
        humidity: rawData.metric.humidity,
        windSpeed: {
            metric: rawData.metric.wind_speed,
            imperial: rawData.metric.wind_speed,
        },
        windDeg: rawData.metric.wind_deg
    };
};

const formatTemp = (value, unit = 'celsius') => {
    if (value == null) return '—';
    return `${value}${unit === 'celsius' ? '°C' : '°F'}`;
};

const formatWind = (value, unit = 'metric') => {
    if (value == null) return '—';
    return `${value} ${unit === 'metric' ? 'm/s' : 'mph'}`;
};

/**
 * Component
 */
const WeatherPanel = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { postType, postId, weatherData, lastUpdate, hasLocation, isPublished } = useSelect((select) => {
        const { getCurrentPostType, getCurrentPostId, getEditedPostAttribute } = select(editorStore);
        const { getEntityRecord } = select(coreStore);
        const post = getEntityRecord('postType', getCurrentPostType(), getCurrentPostId());
        const meta = getEditedPostAttribute('meta') || {};
        return {
            postType: getCurrentPostType(),
            postId: getCurrentPostId(),
            weatherData: normalizeWeatherData(meta._kst_ws_weather_data),
            lastUpdate: meta._kst_ws_last_update || null,
            hasLocation: !!(meta._kst_ws_latitude && meta._kst_ws_longitude),
            isPublished: post?.status === 'publish',
        };
    }, []);

    const { editPost, savePost } = useDispatch(editorStore);

    if (postType !== 'weather-station') {
        return null;
    }

    const handleRefresh = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`/wp-json/kst-weather-stations/v1/refresh-weather/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': kstWeatherStations.restNonce,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                editPost({
                    meta: {
                        _kst_ws_weather_data: data.data,
                        _kst_ws_last_update: data.last_update,
                    },
                });
            } else {
                throw new Error(data.error || __('Failed to update weather data', 'kst-weather-stations'));
            }
        } catch (err) {
            console.error('Weather refresh failed:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderWeather = (data) => {
        if (!data) {
            return <p>{__('No weather data available', 'kst-weather-stations')}</p>;
        }

        const { conditions, temperature, feelsLike, humidity, windSpeed, windDeg } = data;

        return (
            <div className="weather-data-display">
                {conditions?.icon && (
                    <img
                        src={`https://openweathermap.org/img/w/${conditions.icon}.png`}
                        alt={conditions.description || ''}
                        className="weather-icon"
                    />
                )}
                <div className="weather-info">
                    <p>
                        <strong>{__('Conditions:', 'kst-weather-stations')}</strong><br/>
                        {conditions.main} ({conditions.description})
                    </p>
                    <p>
                        <strong>{__('Temperature:', 'kst-weather-stations')}</strong><br/>
                        {formatTemp(temperature.celsius, 'celsius')} ( {formatTemp(temperature.fahrenheit, 'fahrenheit')} )
                        <br />
                        <span className="feels-like">
                            {__('Feels like: ', 'kst-weather-stations')}<br/>
                            {formatTemp(feelsLike.celsius, 'celsius')} ( {formatTemp(feelsLike.fahrenheit, 'fahrenheit')} )
                        </span>
                    </p>
                    <p>
                        <strong>{__('Humidity:', 'kst-weather-stations')}</strong>{' '}
                        {humidity}%
                    </p>
                    <p>
                        <strong>{__('Wind Speed:', 'kst-weather-stations')}</strong><br/>
                        {formatWind(windSpeed.metric, 'metric')} ( {formatWind(windSpeed.imperial, 'imperial')} )
                    </p>
                    <p>
                        <strong>{__('Wind Direction:', 'kst-weather-stations')}</strong>{' '}
                        {windDeg}&deg;
                    </p>
                </div>
            </div>
        );
    };

    return (
        <PluginDocumentSettingPanel
            name="weather-station-weather"
            title={__('Weather Data', 'kst-weather-stations')}
            className="weather-station-weather-panel"
        >
            {!hasLocation ? (
                <p className="location-missing-message" style={{ color: '#cc1818' }}>
                    {__('Please add location data first to fetch weather information.', 'kst-weather-stations')}
                </p>
            ) : (
                <>
                    {renderWeather(weatherData)}
                    {lastUpdate && (
                        <div className="weather-update-time">
                            <small>
                                {__('Last updated:', 'kst-weather-stations')}{' '}
                                {new Date(lastUpdate).toLocaleString()}
                            </small>
                        </div>
                    )}
                    {error && <p className="error-message">{error}</p>}
                    <div className="weather-actions" style={{ display: 'flex', gap: '10px' }}>
                        <Button
                            variant="secondary"
                            onClick={handleRefresh}
                            isBusy={isLoading}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner />
                                    {__('Updating...', 'kst-weather-stations')}
                                </>
                            ) : (
                                __('Refresh Weather Data', 'kst-weather-stations')
                            )}
                        </Button>
                        <Button
                            variant="secondary"
                            isDestructive
                            onClick={async () => {
                                try {
                                    // Clear weather data
                                    await editPost({
                                        meta: {
                                            _kst_ws_weather_data: null,
                                            _kst_ws_last_update: null
                                        }
                                    });

                                    // Force a dirty state
                                    await editPost({ modified: true });

                                    // Save if published
                                    if (isPublished) {
                                        await savePost();
                                    }
                                } catch (err) {
                                    console.error('Failed to delete weather data:', err);
                                    setError(__('Failed to delete weather data', 'kst-weather-stations'));
                                }
                            }}
                        >
                            {__('Delete Weather Data', 'kst-weather-stations')}
                        </Button>
                    </div>
                </>
            )}
        </PluginDocumentSettingPanel>
    );
};

export default WeatherPanel;
