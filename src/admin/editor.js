/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import LocationPanel from './components/LocationPanel';
import WeatherPanel from './components/WeatherPanel';
import './editor.scss';

registerPlugin('weather-station-location', {
    render: LocationPanel,
    icon: 'location',
});

registerPlugin('weather-station-weather', {
    render: WeatherPanel,
    icon: 'cloud',
});