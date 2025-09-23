/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { TextControl } from '@wordpress/components';
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

// Register the plugin
registerPlugin('weather-station-location', {
    render: LocationPanel,
    icon: 'location',
});
