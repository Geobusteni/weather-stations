<?php
/**
 * Admin Settings for the weather stations plugin.
 */

declare( strict_types=1 );

namespace KST\WeatherStations\Admin;

use KST\WeatherStations\Admin\Fields\FieldFactory;
use function KST\WeatherStations\Admin\Fields\test_factory_create;
use const KST\WeatherStations\PATH;
use const KST\WeatherStations\URL;

\defined( 'ABSPATH' ) || exit;

/**
 * The class which holds the settings.
 */
class Settings {

	/**
	 * Make sure the Settings are instantiated only once.
	 *
	 * @var Settings $instance - The class instance.
	 */
	private static $instance;

	/**
	 * @var FieldFactory The variable which holds the factory object.
	 */
	private $factory;

	/**
	 * @var string The setting name where all the values are gather in database.
	 */
	private $setting_name;

	/**
	 * @var string The slug of the admin page.
	 */
	private $screen_id;

	/**
	 * Initializes the admin settings and the menu page.
	 */
	public function __construct( bool $bootstrap=true, $factory = null ) {
		if ( $bootstrap ) {
			\add_action( 'admin_init', [ $this, 'register_settings' ] );
			\add_action( 'admin_menu', [ $this, 'add_menu_page' ] );
			\add_action( 'admin_enqueue_scripts', [ $this, 'register_scripts' ] );
		}

		// Inject the factory class.
		$this->factory = $factory ?? new FieldFactory();
		$this->setting_name = 'kst-weather-stations';
	}

	/**
	 * Prevent cloning.
	 *
	 * @return void
	 */
	public function __clone() {}

	/**
	 * Prevent serializing.
	 *
	 * @return void
	 */
	public function __wakeup(): void {}

	/**
	 * Instance initiator.
	 * We make sure we initiate this only once.
	 *
	 * @return Settings The class object.
	 */
	public static function getInstance(): Settings {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function add_menu_page(): void {
		$id = \add_submenu_page(
			'options-general.php',
			__( 'Weather Stations', 'weather-stations' ),
			__( 'Weather Stations', 'weather-stations' ),
			'manage_options',
			'kst-weather-stations',
			[ $this, 'render_settings_page' ],
			20,
		);

		if ( ! empty( $id ) ) {
			$this->screen_id = $id;
		}
	}

	public function register_scripts(): void {
		if ( file_exists( PATH . 'build-admin/admin.assets.php' ) ) {
			$assets = include PATH . 'build-admin/admin/assets.php';
		}

		$url = \trailingslashit( URL  ). 'build-admin/admin';
		$path = \trailingslashit( PATH ) . 'build-admin/admin';

		\wp_register_script(
			$this->setting_name . 'admin-js',
			$url . '/admin.js',
			$assets['dependencies'] ?? [],
			$assets['version'] ?? \filemtime( $path . '/admin.js' ),
			true
		);

		\wp_register_style(
			$this->setting_name . 'admin-css',
			$url . '/admin.css',
			null,
			$assets['version'] ?? \filemtime( $path . '/admin.css' ),
		);

		if ( $this->screen_id ) {
			$this->enqueue_scripts( $this->screen_id );
		}
	}

	/**
	 * Adding the style and javascript for the admin page.
	 *
	 * @param string $id
	 *
	 * @return void
	 */
    public function enqueue_scripts( string $id ): void {
        $screen = \get_current_screen();
        if ( ! $screen ) {
            return;
        }

        $options = \get_option( $this->setting_name );

        if ( $screen->id === $id ) {
            // Enqueue Mapbox GL JS
            \wp_enqueue_script(
                'mapbox-gl',
                'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
                [],
                '2.15.0',
                true
            );

            \wp_enqueue_style(
                'mapbox-gl',
                'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
                [],
                '2.15.0'
            );

            // Enqueue Mapbox Geocoder
            \wp_enqueue_script(
                'mapbox-geocoder',
                'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js',
                ['mapbox-gl'],
                '5.0.0',
                true
            );

            \wp_enqueue_style(
                'mapbox-geocoder',
                'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css',
                ['mapbox-gl'],
                '5.0.0'
            );

            // Enqueue our admin scripts
            \wp_enqueue_style( $this->setting_name . 'admin-css' );
            \wp_enqueue_script( $this->setting_name . 'admin-js' );

            \wp_localize_script(
                $this->setting_name . 'admin-js',
                'KSTWeatherStations',
                [
                    'mapToken' => $options['mapbox-token'] ?? '',
                    'dataToken' => $options['data-token'] ?? '',
                    'defaultCenter' => $options['mapbox-default-center'] ?? [
                        'address' => '',
                        'lat' => '',
                        'lng' => ''
                    ],
                    'zoom' => $options['mapbox-zoom'] ?? '9',
                    'theme' => $options['mapbox-theme'] ?? 'standard'
                ]
            );
        }
    }


	/**
	 * Creates the settings page fields.
	 *
	 * @return void
	 */
	public function register_settings(): void {
		$pages   = get_posts( [
			'posts_per_page' => -1,
			'post_type'      => 'page',
			'post_status'    => ['publish', 'draft'],
			'fields'         => 'ids'
		] );
		$page_opt = [];

		if ( ! empty( $pages ) ) {
			foreach ( $pages as $page ) {
				$page_opt[ $page ] = get_the_title( $page );
			}
		}

		\register_setting( $this->setting_name, $this->setting_name, [ 'show_in_rest' => true ] );

		\add_settings_section(
			$this->setting_name . '-data-section',
			\esc_html__( 'Weather Stations Data', 'kst-weather-stations' ),
			[ $this, 'render_settings_section' ],
			$this->setting_name
		);

		\add_settings_section(
			$this->setting_name . '-map-section',
			\esc_html__( 'Weather Stations Map Settings', 'kst-weather-stations' ),
			[ $this, 'render_settings_section' ],
			$this->setting_name
		);

		\add_settings_section(
			$this->setting_name . '-admin',
			\esc_html__( 'Weather Stations Admin', 'kst-weather-stations' ),
			[ $this, 'render_settings_section' ],
			$this->setting_name
		);

		\add_settings_field(
			'data-token',
			\esc_html__( 'OpenWeather Token', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-data-section',
			[
				'id'   => 'data-token',
				'type' => 'input',
				'args' => [
					'class' => 'regular-text widefat',
					'hint'  => \esc_html__(
						\sprintf(
							'For the token, you will need to either have an account and <a href="%s"> login here </a> or create an account <a href=%s>here</a>.
							<br /> Find out more about it <a href="%s">here.</a>',
							\esc_url('https://home.openweathermap.org/users/sign_in'),
							\esc_url('https://home.openweathermap.org/users/sign_up'),
							\esc_url('https://youtu.be/VtQeoaVuzRI/'),
						), 'weahter-stations'
					),
					'type'  => 'text',
				],
			]
		);

		\add_settings_field(
			'mapbox-token',
			\esc_html__( 'MapBox Token', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-data-section',
			[
				'id'   => 'mapbox-token',
				'type' => 'input',
				'args' => [
					'class' => 'regular-text widefat',
					'hint'  => \esc_html__(
						sprintf(
							'For getting the API token you must have an account on <a href="%s">Mapbox website</a>.<br/>
							Find out more <a href="%s">here.</a>',
							\esc_url('https://account.mapbox.com/'),
							\esc_url('https://youtu.be/-wRoVqe2mcc'),
						),
					'kst-weather-stations' ),
					'type'  => 'text',
				],
			]
		);

		\add_settings_field(
			'data-interval',
			\esc_html__( 'Time Interval for data collection', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-data-section',
			[
				'id'   => 'data-interval',
				'type' => 'input',
				'args' => [
					'class' => 'small-text',
					'type'  => 'number',
					'min'   => '0.5',
					'step'  => '0.5',
					'max'   => '24',
					'hint'  => \esc_html__( 'Interval to get data, in hours or half of hours. Eg: 0.5, 1, 1.5, etc. Max: 24.', 'kst-weather-stations' ),
				]
			]
		);

		\add_settings_field(
			'mapbox-theme',
			\esc_html__( 'MapBox Theme', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-map-section',
			[
				'id'   => 'mapbox-theme',
				'type' => 'select',
				'args' => [
					'options'       => [
						'standard'           => \esc_html__( 'Standard', 'kst-weather-stations' ),
						'standard-satellite' => \esc_html__( 'Satellite', 'kst-weather-stations' ),
					],
					'class'         => 'regular-text widefat',
					'default_label' => \esc_html__( 'Choose a value', 'kst-weather-stations' ),
					'hint'          => \esc_html__( '', 'kst-weather-stations' ),
				]
			]
		);

		\add_settings_field(
			'mapbox-default-center',
			\esc_html__( 'Default Center', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-map-section',
			[
				'id'   => 'mapbox-default-center',
				'type' => 'address-search',
				'args' => [
					'hint'   => \esc_html__('Add the default center of the map, when the page loads.', 'kst-weather-stations'),
					'class'  => 'regular-text widefat',
					'fields' => [
						'lat' => [
							'label'    => \esc_html__( 'Latitude', 'kst-weather-stations' ),
							'type'     => 'text',
							'readonly' => true,
							'class'    => 'small-text widefat'
						],
						'lng' => [
							'label'    => \esc_html__( 'Longitude', 'kst-weather-stations' ),
							'type'     => 'text',
							'readonly' => true,
							'class'    => 'small-text widefat'
						],
					],
					'value' => \get_option($this->setting_name)['mapbox-default-center'] ?? [
						'address' => '',
						'lat' => '',
						'lng' => ''
					]
				]
			]
		);

		\add_settings_field(
			'mapbox-zoom',
			\esc_html__( 'Zoom level of details', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-map-section',
			[
				'id'   => 'mapbox-zoom',
				'type' => 'input',
				'args' => [
					'hint'  => \esc_html__( 'Choose zoom level from 0 (full zoom out) to 22 (maximum zoom)', 'kst-weather-stations' ),
					'min'   => '0',
					'step'  => '1',
					'max'   => '22',
					'type'  => 'number',
					'class' => 'small-text',
				]
			]
		);

		\add_settings_field(
			'map-page',
			\esc_html__( 'Choose Map Page', 'kst-weather-stations' ),
			[ $this, 'render_settings_field' ],
			'kst-weather-stations',
			'kst-weather-stations-admin',
			[
				'id'   => 'map-page',
				'type' => 'select',
				'args' => [
					'class'         => 'regular-text widefat',
					'default_label' => \esc_html__( 'Choose a page', 'kst-weather-stations' ),
					'options'       => $page_opt,
					'hint'          => \esc_html__(
						'Choose a page for showing the weather stations map. This will override the default created page.',
						'kst-weather-stations'
					),
				],
			]
		);

		/**
		 * Enable third party fields and swttings addition.
		 */
		\do_action( 'kst-wheather-stations-add-settings' );
	}

	/**
	 * Add details to the sections.
	 * We leave it empty for now.
	 * We cna extend it in the future with some classes and options (arguments).
	 *
	 * @return void
	 */
	public function render_settings_section(): void {
		echo '';
	}

	/**
	 * Renders the fields for the settings page.
	 *
	 * @param array $args
	 *
	 * @return void
	 */
	public function render_settings_field( array $args ): void {
		$default_args = [
			'id'   => \uniqid(),
			'type' => 'p',
			'args' => []
		];

		$args  = array_merge( $default_args, $args );
		$args['args']['setting'] = \esc_attr( $this->setting_name );
		$field = $this->factory->create( $args['id'], $args['type'], $args['args'] );
		$hint  = ! empty( $args['hint'] ) ? sprintf( '<p class="widefat description">%s</p>', \esc_html( $args['hint'] ) ) : '';

		echo sprintf(
			'<div class="%s-field">%s%s</div>',
			\esc_attr( $this->setting_name ),
			$field->render(),
			$hint
		);
	}

	public function render_settings_page(): void {
		echo \sprintf(
			'<h2 class="%s-title">%s</h2>',
			\esc_attr( $this->setting_name ),
			\esc_html__( 'Weather Stations Settings', 'kst-weather-stations' )
		);

		echo '<form class="' . $this->setting_name . '-form" method="post" action="options.php">';

		\settings_fields( $this->setting_name );
		\do_settings_sections( $this->setting_name );
		\submit_button();

		echo '</form>';
	}
}
