<?php
/**
 * Renders the map page.
 *
 * @package kst-weather-stations.
 */
wp_head();

$bodyclasses = array_merge(
	get_body_class(),
	['fullwidth', 'map-only', 'kst-weather-stations-page']
);

echo sprintf( '<body class="%s">', implode( ' ', $bodyclasses) );

while ( have_posts() ) :
	the_post();
	the_content(); // outputs only your block(s)
endwhile;


wp_footer();

 echo '</body></html>';
