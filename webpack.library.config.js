const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, {mode}) => ({
    mode: 'none',

    entry: mode === 'production' ? {
        'slider.min': ['./src/slider/slider.module.ts']
    } : {
        'slider': ['./src/slider/slider.module.ts']
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: 'histogram-slider',
        libraryTarget: 'umd'
    },

    externals: {
        angular: 'angular',
        '@kpsys/angularjs-register': '@kpsys/angularjs-register'
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
                                '@babel/preset-env'
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
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
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
                ]
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
        extensions: ['.ts', '.js']
    },

    optimization: {
        splitChunks: {
            cacheGroups: {
                jsVendors: {
                    test: isJsVendor,
                    name: 'vendors',
                    chunks: 'all'
                },
                cssVendors: {
                    test: isCssVendor,
                    name: 'vendors',
                    chunks: 'all',
                    enforce: true
                }
            }
        }
    },

    devtool: 'source-map',

    plugins: (function () {
        const plugins = [
            new MiniCssExtractPlugin({
                filename: '[name].css'
            }),
            new CleanWebpackPlugin(
                ['dist/*.*'],
                {
                    root: path.resolve(__dirname),
                    verbose: true,
                    exclude: ['.gitkeep']
                }
            )];
        if (mode === 'production') {
            plugins.push(new UnminifiedWebpackPlugin());
        }

        return plugins;
    })()
});

function isJsVendor({resource}) {
    return resource &&
        resource.indexOf('node_modules') >= 0 &&
        resource.match(/.js$/);
}

function isCssVendor({resource}) {
    return resource &&
        resource.indexOf('node_modules') >= 0 &&
        resource.match(/.css$/);
}
