<?php

use KST\WeatherStations\Admin\Fields\InputField;
use KST\WeatherStations\Admin\Fields\SettingFieldInterface;

WP_Mock::bootstrap();

/**
 * Unit tests for testing the KST\WeatherStations\Admin\Fields\SettingFieldInterface\render() function
 */

class TestRenderField extends \PHPUnit\Framework\TestCase {

	/**
	 * Testing rendering of the field.
	 *
	 * @return void
	 */
	public function testRenderFieldHtml(): void {
		$fakeField = $this->getMockBuilder( SettingFieldInterface::class )
			->onlyMethods( [ 'render' ] )
			->getMock();
		$fakeField->method( 'render' )->willReturn( '<input id="test" name="test" type="text" value="test" />' );
		$fakeFactory = new class  {
			public function create ( $id, $type, $args ) {
				return new class implements SettingFieldInterface {
					public function render(): string {
						return '<input id="test" name="test" type="text" value="test" />';
					}
				};
			}
		};

		\WP_Mock::userFunction( 'KST\WeatherStations\Admin\Fields\FieldFactory\test_factory_create', [ 'return' => $fakeField ] )->once();

		$settings =  new KST\WeatherStations\Admin\Settings(false, new $fakeFactory() );

		ob_start();
		$settings->render_settings_field([
			'id'   => 'test',
			'type' => 'text',
			'args' => [
				'value' => 'test',
			]
		]);
		$output = ob_get_clean();

		$this->assertEquals( '<div class="kst-weather-stations-field"><input id="test" name="test" type="text" value="test" /></div>', $output );
	}

}
