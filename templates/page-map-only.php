<?php
/**
 * Renders the map page.
 *
 * @package kst-weather-stations.
 */
wp_head();

echo sprintf( '<body class="%s">', implode( ' ', get_body_class() ) );

while ( have_posts() ) :
	the_post();
	the_content(); // outputs only your block(s)
endwhile;


wp_footer();

 echo '</body></html>';
