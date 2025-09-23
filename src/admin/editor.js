/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { TextControl, Button, Spinner } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { store as editorStore } from '@wordpress/editor';
import { registerPlugin } from '@wordpress/plugins';

/**
 * Location panel component
 */
const LocationPanel = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Get post type and meta values
    const { postType, address, latitude, longitude } = useSelect((select) => {
        const { getCurrentPostType, getEditedPostAttribute } = select(editorStore);
        return {
            postType: getCurrentPostType(),
            address: getEditedPostAttribute('meta')?._kst_ws_address || '',
            latitude: getEditedPostAttribute('meta')?._kst_ws_latitude || '',
            longitude: getEditedPostAttribute('meta')?._kst_ws_longitude || '',
        };
    }, []);

    // Get dispatch functions
    const { editPost } = useDispatch(editorStore);

    // Only show panel for weather stations
    if (postType !== 'weather_station') {
        return null;
    }

    // Handle geocoding
    const handleGeocode = async () => {
        if (!address) {
            setError(__('Please enter an address', 'kst-weather-stations'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(
                `${kstWeatherStations.restUrl}/geocode?address=${encodeURIComponent(address)}`,
                {
                    headers: {
                        'X-WP-Nonce': kstWeatherStations.restNonce,
                    },
                }
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            editPost({
                meta: {
                    _kst_ws_latitude: data.coordinates.lat,
                    _kst_ws_longitude: data.coordinates.lng,
                },
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle reverse geocoding
    const handleReverseGeocode = async () => {
        if (!latitude || !longitude) {
            setError(__('Please enter both latitude and longitude', 'kst-weather-stations'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(
                `${kstWeatherStations.restUrl}/reverse-geocode?lat=${latitude}&lng=${longitude}`,
                {
                    headers: {
                        'X-WP-Nonce': kstWeatherStations.restNonce,
                    },
                }
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            editPost({
                meta: {
                    _kst_ws_address: data.address,
                },
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PluginDocumentSettingPanel
            name="weather-station-location"
            title={__('Location', 'kst-weather-stations')}
            className="weather-station-location-panel"
        >
            <TextControl
                label={__('Address', 'kst-weather-stations')}
                value={address}
                onChange={(value) =>
                    editPost({ meta: { _kst_ws_address: value } })
                }
                onBlur={handleGeocode}
            />
            <div className="coordinates-group">
                <TextControl
                    label={__('Latitude', 'kst-weather-stations')}
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(value) =>
                        editPost({ meta: { _kst_ws_latitude: parseFloat(value) } })
                    }
                    onBlur={handleReverseGeocode}
                />
                <TextControl
                    label={__('Longitude', 'kst-weather-stations')}
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(value) =>
                        editPost({ meta: { _kst_ws_longitude: parseFloat(value) } })
                    }
                    onBlur={handleReverseGeocode}
                />
            </div>
            {isLoading && <p>{__('Loading...', 'kst-weather-stations')}</p>}
            {error && <p className="error-message">{error}</p>}
        </PluginDocumentSettingPanel>
    );
};

/**
 * Weather data panel component
 */
const WeatherPanel = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Get post type and meta values
    const { postType, postId, weatherData, lastUpdate } = useSelect((select) => {
        const { getCurrentPostType, getCurrentPostId, getEditedPostAttribute } = select(editorStore);
        return {
            postType: getCurrentPostType(),
            postId: getCurrentPostId(),
            weatherData: getEditedPostAttribute('meta')?._kst_ws_weather_data || null,
            lastUpdate: getEditedPostAttribute('meta')?._kst_ws_last_update || null,
        };
    }, []);

    // Only show panel for weather stations
    if (postType !== 'weather_station') {
        return null;
    }

    // Handle manual refresh
    const handleRefresh = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(
                `${kstWeatherStations.restUrl}/refresh-weather/${postId}`,
                {
                    method: 'POST',
                    headers: {
                        'X-WP-Nonce': kstWeatherStations.restNonce,
                    },
                }
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // The data will be automatically updated through the REST API
            // No need to manually update the post meta
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Format the weather data for display
    const formatWeatherData = () => {
        if (!weatherData) {
            return __('No weather data available', 'kst-weather-stations');
        }

        return (
            <div className="weather-data">
                <div className="weather-row">
                    <span className="label">{__('Temperature:', 'kst-weather-stations')}</span>
                    <span className="value">
                        {weatherData.temp.celsius}°C / {weatherData.temp.fahrenheit}°F
                    </span>
                </div>
                <div className="weather-row">
                    <span className="label">{__('Feels like:', 'kst-weather-stations')}</span>
                    <span className="value">
                        {weatherData.feels_like.celsius}°C / {weatherData.feels_like.fahrenheit}°F
                    </span>
                </div>
                <div className="weather-row">
                    <span className="label">{__('Humidity:', 'kst-weather-stations')}</span>
                    <span className="value">{weatherData.humidity}%</span>
                </div>
                <div className="weather-row">
                    <span className="label">{__('Wind:', 'kst-weather-stations')}</span>
                    <span className="value">
                        {weatherData.wind_speed.metric} m/s / {weatherData.wind_speed.imperial} mph
                    </span>
                </div>
                {weatherData.weather && (
                    <div className="weather-row">
                        <span className="label">{__('Conditions:', 'kst-weather-stations')}</span>
                        <span className="value">
                            {weatherData.weather.description}
                            {weatherData.weather.icon && (
                                <img 
                                    src={`https://openweathermap.org/img/wn/${weatherData.weather.icon}@2x.png`}
                                    alt={weatherData.weather.description}
                                    className="weather-icon"
                                />
                            )}
                        </span>
                    </div>
                )}
                {lastUpdate && (
                    <div className="weather-row last-update">
                        <span className="label">{__('Last update:', 'kst-weather-stations')}</span>
                        <span className="value">{lastUpdate}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <PluginDocumentSettingPanel
            name="weather-station-weather"
            title={__('Weather Data', 'kst-weather-stations')}
            className="weather-station-weather-panel"
        >
            {formatWeatherData()}
            <div className="weather-actions">
                <Button
                    isPrimary
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Spinner />
                            {__('Refreshing...', 'kst-weather-stations')}
                        </>
                    ) : (
                        __('Refresh Weather Data', 'kst-weather-stations')
                    )}
                </Button>
            </div>
            {error && <p className="error-message">{error}</p>}
        </PluginDocumentSettingPanel>
    );
};

// Register the plugins
registerPlugin('weather-station-location', {
    render: LocationPanel,
    icon: 'location',
});

registerPlugin('weather-station-weather', {
    render: WeatherPanel,
    icon: 'cloud',
});