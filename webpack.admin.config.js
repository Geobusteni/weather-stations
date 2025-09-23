const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
    ...defaultConfig,
    entry: {
        ...defaultConfig.entry,
        'admin/admin': path.resolve('src/admin/admin.js'),
        'admin/editor': path.resolve('src/admin/editor.js'),
    },
    output: {
        ...defaultConfig.output,
        path: path.resolve(process.cwd(), 'build-admin'),
        filename: '[name].js',
        clean: true
    }
};
