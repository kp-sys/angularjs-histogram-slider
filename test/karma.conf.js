const path = require('path');

module.exports = (config) => {
    config.set({
        basePath: path.resolve(__dirname, '..'),

        frameworks: ['jasmine'],

        files: [
            path.resolve(__dirname, '..', 'node_modules', 'angular', 'angular.js'),
            path.resolve(__dirname, '..', 'node_modules', 'angular-mocks', 'angular-mocks.js'),
            './src/**/*.spec.ts'
        ],

        preprocessors: {
            '**/*.ts': ['webpack', 'sourcemap']
        },

        plugins: [
            require('karma-webpack'),
            require('karma-jasmine'),
            require('karma-spec-reporter'),
            require('karma-source-map-support'),
            require('karma-sourcemap-loader'),
            require('karma-coverage-istanbul-reporter'),
            require('karma-chrome-launcher')
        ],

        browsers: ['ChromiumHeadlessNoSandbox'],

        customLaunchers: {
            'ChromiumHeadlessNoSandbox': {
                base: 'ChromiumHeadless',
                flags: [
                    '--disable-gpu',
                    '--no-sandbox'
                ],
                debug: true
            }
        },

        singleRun: true,

        reporters: ['spec', 'coverage-istanbul'],

        webpack: require('./webpack.test.config'),

        webpackMiddleware: {
            stats: 'errors-only'
        },

        coverageIstanbulReporter: {
            reports: ['text-summary', 'html'],
            dir: path.resolve(__dirname, '..', 'reports', 'coverage'),
            fixWebpackSourcePaths: true,
            combineBrowserReports: true,
            'es-modules': true,
            thresholds: {
                emitWarning: false,

                global: {
                    statements: 90,
                    lines: 90,
                    branches: 80,
                    functions: 90
                }
            }
        }
    });
};
