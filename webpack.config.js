var path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
var webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: ['./src/index.ts',"./src/index.html"],
    devtool: 'source-map',
    devServer: {
        contentBase: './dist'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(jpe?g|png|svg|gif)$/,
                use:"file-loader"
            },
            {
                test: /\.html/, 
                use: 'file-loader?name=[name].[ext]', 
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        path: path.resolve(__dirname, 'dist')
    }
    // optimization: {
    //     minimizer: [
    //         new TerserPlugin({
    //             cache: true,
    //             parallel: true,
    //             sourceMap: true,// Must be set to true if using source-maps in production
    //             terserOptions: {
    //                 // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
    //                 ecma: undefined,
    //                 mangle: {
    //                     // mangle options
    //                     properties: {
    //                         // mangle property options
    //                         //mangle all variables starting with underscore "_"
    //                         regex: /^_/
    //                     }
    //                 },
    //             }
    //         }),
    //     ],
    // }
};