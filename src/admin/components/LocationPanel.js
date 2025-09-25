/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { TextControl, Button } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { store as editorStore } from '@wordpress/editor';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Location panel component
 */
const LocationPanel = () => {
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Get post type, meta values, and post status
    const { postType, postId, address, latitude, longitude, isEditedMetaFieldValue, isPublished } = useSelect((select) => {
        const { getCurrentPostType, getCurrentPostId, getEditedPostAttribute } = select(editorStore);
        const { getEntityRecord } = select(coreStore);
        const post = getEntityRecord('postType', getCurrentPostType(), getCurrentPostId());
        
        return {
            postType: getCurrentPostType(),
            postId: getCurrentPostId(),
            address: getEditedPostAttribute('meta')?._kst_ws_address || '',
            latitude: getEditedPostAttribute('meta')?._kst_ws_latitude || '',
            longitude: getEditedPostAttribute('meta')?._kst_ws_longitude || '',
            isEditedMetaFieldValue: getEditedPostAttribute('meta'),
            isPublished: post?.status === 'publish',
        };
    }, []);

    // Get dispatch functions
    const { editPost, savePost } = useDispatch(editorStore);

    // Only show panel for weather stations
    if (postType !== 'weather-station') {
        return null;
    }

    // Handle saving or publishing
    const handleSave = async () => {
        if (isPublished) {
            await savePost();
        } else {
            // If not published, trigger the publish button
            const publishButton = document.querySelector('.editor-post-publish-button__button');
            if (publishButton) {
                publishButton.click();
            }
        }
    };

    // Handle geocoding result
    const handleGeocodeResult = async (address, lng, lat) => {
        const newMeta = {
            _kst_ws_address: address,
            _kst_ws_longitude: lng,
            _kst_ws_latitude: lat,
        };

        // Update the post meta
        editPost({
            meta: {
                ...isEditedMetaFieldValue,
                ...newMeta
            }
        });

        // Force a dirty state
        editPost({ modified: true });

        // Save or publish
        await handleSave();
    };

    // Handle address search
    const handleAddressSearch = async (searchText) => {
        if (!searchText || searchText.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (!kstWeatherStations?.mapToken) {
            setError(__('Mapbox token is not configured', 'kst-weather-stations'));
            return;
        }

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?` +
                new URLSearchParams({
                    access_token: kstWeatherStations.mapToken,
                    types: 'address,place,poi',
                    limit: 5,
                    language: 'en'
                }),
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.features) {
                setSuggestions(data.features.map(feature => ({
                    text: feature.place_name,
                    coordinates: feature.center
                })));
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error('Address search failed:', err);
            setError(__('Failed to fetch address suggestions', 'kst-weather-stations'));
        }
    };

    // Handle reverse geocoding
    const handleReverseGeocode = async (lng, lat) => {
        if (!kstWeatherStations?.mapToken) {
            setError(__('Mapbox token is not configured', 'kst-weather-stations'));
            return;
        }

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${kstWeatherStations.mapToken}`,
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const address = data.features[0].place_name;
                await handleGeocodeResult(address, lng, lat);
            }
        } catch (err) {
            console.error('Reverse geocoding failed:', err);
            setError(__('Failed to get address for coordinates', 'kst-weather-stations'));
        }
    };

    // Handle suggestion selection
    const handleSuggestionSelect = async (suggestion) => {
        await handleGeocodeResult(
            suggestion.text,
            suggestion.coordinates[0],
            suggestion.coordinates[1]
        );
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Handle click outside suggestions
    const handleClickOutside = () => {
        setShowSuggestions(false);
    };

    // Handle field changes
    const handleFieldChange = (field, value) => {
        const newMeta = {
            [field]: value
        };

        editPost({
            meta: {
                ...isEditedMetaFieldValue,
                ...newMeta
            }
        });

        // Force a dirty state
        editPost({ modified: true });

        // If both lat and lng are set, trigger reverse geocoding
        if (field === '_kst_ws_latitude' || field === '_kst_ws_longitude') {
            const newLat = field === '_kst_ws_latitude' ? value : latitude;
            const newLng = field === '_kst_ws_longitude' ? value : longitude;
            
            if (newLat && newLng) {
                handleReverseGeocode(newLng, newLat);
            }
        }
    };

    return (
        <PluginDocumentSettingPanel
            name="weather-station-location"
            title={__('Location', 'kst-weather-stations')}
            className="weather-station-location-panel"
        >
            <div className="address-search-container">
                <TextControl
                    __next40pxDefaultSize
                    __nextHasNoMarginBottom
                    label={__('Address', 'kst-weather-stations')}
                    value={address}
                    onChange={(value) => {
                        handleFieldChange('_kst_ws_address', value);
                        handleAddressSearch(value);
                    }}
                    onBlur={() => {
                        // Small delay to allow click on suggestion
                        setTimeout(handleClickOutside, 200);
                    }}
                />
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="address-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                onClick={() => handleSuggestionSelect(suggestion)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSuggestionSelect(suggestion)}
                                role="button"
                                tabIndex={0}
                            >
                                {suggestion.text}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="coordinates-group">
                <TextControl
                    __next40pxDefaultSize
                    __nextHasNoMarginBottom
                    label={__('Latitude', 'kst-weather-stations')}
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(value) => handleFieldChange('_kst_ws_latitude', parseFloat(value))}
                />
                <TextControl
                    __next40pxDefaultSize
                    __nextHasNoMarginBottom
                    label={__('Longitude', 'kst-weather-stations')}
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(value) => handleFieldChange('_kst_ws_longitude', parseFloat(value))}
                />
            </div>
            {error && <p className="error-message">{error}</p>}
            
            <div className="delete-data-section" style={{ marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
                <Button
                    variant="secondary"
                    isDestructive
                    onClick={async () => {
                        // Clear all location and weather meta fields
                        const clearedMeta = {
                            _kst_ws_address: '',
                            _kst_ws_latitude: null,
                            _kst_ws_longitude: null,
                            _kst_ws_weather_data: null,
                            _kst_ws_last_update: null,
                        };

                        // Update the post meta
                        editPost({
                            meta: {
                                ...isEditedMetaFieldValue,
                                ...clearedMeta
                            }
                        });

                        // Force a dirty state
                        editPost({ modified: true });

                        // Save if published
                        if (isPublished) {
                            await savePost();
                        }
                    }}
                >
                    {__('Delete Location & Weather Data', 'kst-weather-stations')}
                </Button>
            </div>
        </PluginDocumentSettingPanel>
    );
};

export default LocationPanel;