/**
 * WordPress dependencies.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies.
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the editor.
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
    const { title, selectedStations = [], showAllStations } = attributes;
    const blockProps = useBlockProps({
        className: 'weather-stations-map',
    });

    const allStations = useSelect(
        (select) =>
            select('core').getEntityRecords('postType', 'weather_station', {
                per_page: -1,
                order: 'ASC',
                orderby: 'title',
            }),
        [selectedStations, showAllStations]
    );

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
        if( !stations || stations.length <= 0 ) {
            return __('There are no stations. Please go and create some stations posts.', 'weather-stations-map');
        }

        return stations?.map((station) => (
            <ToggleControl
                key={station.id}
                label={station.title.rendered}
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
                        {allStations?.map((station) => (
                            <span key={station.id}>{station.title.rendered}</span>
                        ))}
                    </p>
                )}

                {selectedStations.length > 0 && (
                    <p>
                        {selectedStations?.map((station) => (
                            <span key={station.id}>{station.title.rendered}</span>
                        ))}
                    </p>
                )}

                {selectedStations.length <= 0 && !showAllStations && (
                    <p>{__('This block will render the map on frontend', 'weather-stations-map')}</p>
                )}
            </div>
        </>
    );
}
