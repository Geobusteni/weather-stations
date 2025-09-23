/**
 * External dependencies
 */
import mapboxgl from 'mapbox-gl';

/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Pin from './Pin';
import StationsList from './StationsList';

const Map = ({
    token,
    center = [26.1025, 44.4268], // Default to Bucharest
    zoom = 16,
    theme = 'streets-v12',
    stations = [],
    onStationClick,
    showSidebar = false,
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef({});

    useEffect(() => {
        if (!token || !mapContainer.current) return;

        // Initialize map
        mapboxgl.accessToken = token;
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: `mapbox://styles/mapbox/${theme === 'satellite' ? 'satellite-streets-v12' : 'streets-v12'}`,
            center,
            zoom,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl());

        return () => map.current?.remove();
    }, [token]);

    // Update markers when stations change
    useEffect(() => {
        if (!map.current) return;

        // Remove existing markers
        Object.values(markers.current).forEach(marker => marker.remove());
        markers.current = {};

        // Add new markers
        stations.forEach(station => {
            const { id, lat, lng, title, weather, lastUpdate } = station;
            if (!lat || !lng) return;

            const marker = new Pin({
                map: map.current,
                coordinates: [lng, lat],
                title,
                weather,
                lastUpdate,
                onClick: () => onStationClick?.(station),
            });

            markers.current[id] = marker;
        });

        // Fit bounds if we have stations
        if (stations.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            stations.forEach(({ lat, lng }) => {
                if (lat && lng) bounds.extend([lng, lat]);
            });
            map.current.fitBounds(bounds, { padding: 50 });
        }
    }, [stations]);

    // Update map style when theme changes
    useEffect(() => {
        if (!map.current) return;
        map.current.setStyle(`mapbox://styles/mapbox/${theme === 'satellite' ? 'satellite-streets-v12' : 'streets-v12'}`);
    }, [theme]);

    // Center map on specific station
    const centerOnStation = (station) => {
        if (!map.current || !station.lat || !station.lng) return;
        map.current.flyTo({
            center: [station.lng, station.lat],
            zoom: 16,
            essential: true,
        });
        markers.current[station.id]?.showPopup();
    };

    return (
        <div className="weather-stations-map-wrapper">
            {showSidebar && (
                <StationsList
                    stations={stations}
                    onStationClick={centerOnStation}
                />
            )}
            <div
                ref={mapContainer}
                className="weather-stations-map-container"
                style={{ height: '500px', width: '100%' }}
            />
        </div>
    );
};

export default Map;