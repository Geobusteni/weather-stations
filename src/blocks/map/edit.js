/**
 * WordPress dependencies.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies.
 */
import './editor.scss';

export default function Edit({ attributes, setAttributes }) {
    const { selectedStations = [], showAllStations } = attributes;
    const blockProps = useBlockProps({
        className: 'weather-stations-map',
    });

    const [allStations, setAllStations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchAllStations = async () => {
            try {
                let page = 1;
                let stations = [];
                let totalPages = 1;

                while (page <= totalPages) {
                    const response = await apiFetch({
                        path: `/wp/v2/weather-station?per_page=100&page=${page}&orderby=title&order=asc`,
                        parse: false, // get raw Response object
                    });

                    const data = await response.json();
                    const totalPagesHeader = response.headers.get('X-WP-TotalPages');
                    totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;

                    stations = [...stations, ...data];
                    page++;
                }

                if (isMounted) {
                    setAllStations(stations);
                }
            } catch (error) {
                console.error('Failed to fetch stations:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchAllStations();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleStationsArray = (stations, current) => {
        const updatedStations = [...stations];
        const index = updatedStations.indexOf(current);

        if (index > -1) {
            updatedStations.splice(index, 1);
        } else {
            updatedStations.push(current);
        }

        return updatedStations;
    };

    const makeStationsCheckbox = (stations) => {
        if (loading) {
            return __('Loading stations…', 'weather-stations-map');
        }

        if (!stations || stations.length <= 0) {
            return __('There are no stations. Please go and create some station posts.', 'weather-stations-map');
        }

        return stations.map((station) => (
            <ToggleControl
                key={station.id}
                label={station.title?.rendered || station.slug}
                checked={selectedStations.includes(station.id)}
                onChange={() => {
                    setAttributes({
                        selectedStations: handleStationsArray(selectedStations, station.id),
                    });
                }}
            />
        ));
    };

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Settings', 'weather-stations-map')}>
                    <ToggleControl
                        label={__('Show all stations', 'weather-stations-map')}
                        checked={showAllStations}
                        onChange={() =>
                            setAttributes({ showAllStations: !showAllStations })
                        }
                    />
                </PanelBody>
                <PanelBody title={__('Choose Stations', 'weather-stations-map')}>
                    {makeStationsCheckbox(allStations)}
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                {showAllStations && (
                    <p>
                        {allStations.map((station) => (
                            <span key={station.id}>{station.title.rendered}</span>
                        ))}
                    </p>
                )}

                {selectedStations.length > 0 && !showAllStations && (
                    <p>
                        {selectedStations.map((stationId) => {
                            const station = allStations.find((s) => s.id === stationId);
                            return station ? (
                                <span key={station.id}>{station.title.rendered}</span>
                            ) : null;
                        })}
                    </p>
                )}

                {selectedStations.length <= 0 && !showAllStations && (
                    <p>{__('This block will render the map on frontend', 'weather-stations-map')}</p>
                )}
            </div>
        </>
    );
}
