const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');
const depExtraction = require('@wordpress/dependency-extraction-webpack-plugin');

module.exports = {
    ...defaultConfig,
    entry: {
        ...defaultConfig.entry,
        'admin/admin': path.resolve('src/admin/admin.js'),
        'admin/editor': path.resolve('src/admin/editor.js'),
    },
    output: {
        ...defaultConfig.output,
        path: path.resolve( process.cwd(), 'build'),
        filename: '[name].js',
        clean: true
    },
    plugins: [
        ...defaultConfig.plugins.filter(
            ( plugin ) => !( plugin instanceof depExtraction )
        ),
        new depExtraction({
            injectPolyfill: true,
            combineAssets: false,
            outputFormat: 'php',
            outputFilename: '/admin/assets.php',
        })
    ]
};
