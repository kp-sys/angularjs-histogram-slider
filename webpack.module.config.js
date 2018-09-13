const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    mode: 'none',

    entry: {
        'histogram-slider': ['./src/histogram-slider.module.ts']
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: 'HistogramSlider',
        libraryTarget: 'umd'
    },

    externals: {
        angular: {
            commonjs: 'angular',
            commonjs2: 'angular',
            amd: 'angular',
            root: 'angular'
        },
        'angularjs-register': {
            commonjs: 'angularjs-register',
            commonjs2: 'angularjs-register',
            amd: 'angularjs-register',
            root: 'angularjs-register'
        }
    },

    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.ts$/,
                include: [/src/],
                loader: 'tslint-loader'
            },
            {
                test: /\.ts$/,
                include: [/src/],
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            plugins: [
                                'angularjs-annotate'
                            ],
                            presets: [
                                [
                                    'env',
                                    {
                                        'targets': {
                                            'browsers': [
                                                'last 2 versions',
                                                'not ie < 11 '
                                            ]
                                        }
                                    }
                                ]
                            ]
                        }
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            onlyCompileBundledFiles: true
                        }
                    }
                ]
            },
            {
                test: /(\.less$)|(\.css$)/,
                use: ExtractTextPlugin.extract({
                    use: [
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true
                            }
                        },
                        {
                            loader: 'less-loader',
                            options: {
                                sourceMap: true
                            }
                        }
                    ],
                    fallback: 'style-loader'
                })
            },
            {
                test: /\.tpl.pug/,
                use: [
                    {
                        loader: 'ngtemplate-loader',
                        options: {
                            relativeTo: path.resolve(__dirname, 'src')
                        }
                    },
                    {
                        loader: 'html-loader'
                    },
                    {
                        loader: 'pug-html-loader'
                    }
                ]
            }
        ]
    },

    resolve: {
        extensions: ['.js', '.ts']
    },

    optimization: {
        splitChunks: {
            cacheGroups: {
                vendors: {
                    test: isVendor,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },

    devtool: 'source-map',

    plugins: [
        new ExtractTextPlugin({filename: '[name].css', disable: false, allChunks: true}),
        new CleanWebpackPlugin(
            ['dist/*.*'],
            {
                root: path.resolve(__dirname),
                verbose: true,
                exclude: ['.gitkeep']
            }
        )
    ]
};

function isVendor({resource}) {
    return resource &&
        resource.indexOf('node_modules') >= 0 &&
        resource.match(/.js$/);
}