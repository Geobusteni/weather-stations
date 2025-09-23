/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { Icon, chevronLeft } from '@wordpress/icons';

const SavedLocations = ({ stations, onStationSelect, onBack }) => {
    const favorites = JSON.parse(localStorage.getItem('kst_favorite_stations') || '[]');
    const savedStations = stations.filter(station => favorites.includes(station.id));

    if (!savedStations.length) {
        return (
            <div className="saved-locations-empty">
                <p>{__('No saved locations yet.', 'kst-weather-stations')}</p>
                <Button
                    variant="secondary"
                    onClick={onBack}
                    icon={<Icon icon={chevronLeft} />}
                >
                    {__('Back to Map', 'kst-weather-stations')}
                </Button>
            </div>
        );
    }

    return (
        <div className="saved-locations">
            <div className="saved-locations-header">
                <Button
                    variant="secondary"
                    onClick={onBack}
                    icon={<Icon icon={chevronLeft} />}
                >
                    {__('Back to Map', 'kst-weather-stations')}
                </Button>
                <h3>{__('Saved Locations', 'kst-weather-stations')}</h3>
            </div>
            <ul className="saved-locations-list">
                {savedStations.map(station => (
                    <li key={station.id}>
                        <Button
                            variant="secondary"
                            className="saved-location-item"
                            onClick={() => onStationSelect(station)}
                        >
                            <h4>{station.title}</h4>
                            <p>{station.address}</p>
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SavedLocations;
