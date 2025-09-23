/**
 * WordPress dependencies
 */
import { render } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Map from '../components/map/Map';
import '../components/map/style.scss';

// Initialize admin map
const initAdminMap = () => {
    const container = document.querySelector('#kst-weather-stations-map');
    if (!container) return;

    const token = container.dataset.token;
    const latHolder = document.querySelector('input[id*="-center-lat"]');
    const lngHolder = document.querySelector('input[id*="-center-lng"]');
    const addressHolder = document.querySelector('input[id*="-center-address"]');

    if (!token || !latHolder || !lngHolder || !addressHolder) {
        console.error('Missing required elements');
        return;
    }

    const lat = parseFloat(latHolder.value) || 44.4268;
    const lng = parseFloat(lngHolder.value) || 26.1025;

    // Create single station data for admin map
    const station = {
        id: 'admin',
        title: addressHolder.value || 'Default Location',
        lat,
        lng,
    };

    render(
        <Map
            token={token}
            center={[lng, lat]}
            zoom={16}
            stations={[station]}
            onStationClick={(station) => {
                latHolder.value = station.lat;
                lngHolder.value = station.lng;
                // Trigger change event to update form state
                latHolder.dispatchEvent(new Event('change', { bubbles: true }));
                lngHolder.dispatchEvent(new Event('change', { bubbles: true }));
            }}
        />,
        container
    );
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdminMap);