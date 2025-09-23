/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { store as editorStore } from '@wordpress/editor';
import { registerPlugin } from '@wordpress/plugins';

/**
 * Location panel component
 */
const LocationPanel = () => {
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Get post type and meta values
    const { postType, address, latitude, longitude, isEditedMetaFieldValue } = useSelect((select) => {
        const { getCurrentPostType, getEditedPostAttribute } = select(editorStore);
        return {
            postType: getCurrentPostType(),
            address: getEditedPostAttribute('meta')?._kst_ws_address || '',
            latitude: getEditedPostAttribute('meta')?._kst_ws_latitude || '',
            longitude: getEditedPostAttribute('meta')?._kst_ws_longitude || '',
            isEditedMetaFieldValue: getEditedPostAttribute('meta'),
        };
    }, []);

    // Get dispatch functions
    const { editPost } = useDispatch(editorStore);

    // Only show panel for weather stations
    if (postType !== 'weather-station') {
        return null;
    }

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

    // Handle suggestion selection
    const handleSuggestionSelect = (suggestion) => {
        const newMeta = {
            _kst_ws_address: suggestion.text,
            _kst_ws_longitude: suggestion.coordinates[0],
            _kst_ws_latitude: suggestion.coordinates[1],
        };

        editPost({
            meta: {
                ...isEditedMetaFieldValue,
                ...newMeta
            }
        });

        // Force a dirty state
        editPost({ modified: true });
        
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
        </PluginDocumentSettingPanel>
    );
};

// Register the plugin
registerPlugin('weather-station-location', {
    render: LocationPanel,
    icon: 'location',
});