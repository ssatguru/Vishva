var path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
var webpack = require('webpack');

module.exports = {
    mode:'development',
    entry:'./src/index.ts',
    devtool:'source-map',
    devServer:{
        contentBase:'./public_html/bin'
    },
    module:{
        rules:[
            {
                test:/\.tsx?$/,
                use:'ts-loader',
                exclude:/node_modules/
            }
        ]
    },
    // externals:{
    //     jquery:{root:"$"}
    // },
    // plugins: [
    //     new webpack.ProvidePlugin({
    //         $: "jquery",
    //         jQuery: "jquery"
    //     })
    // ],
    resolve:{
        extensions:['.tsx','.ts','.js']
    },
    output:{
        path:path.resolve(__dirname,'public_html/bin')
    },
    optimization:{
        minimizer:[
            new TerserPlugin({
                cache:true,
                parallel:true,
                sourceMap:true,// Must be set to true if using source-maps in production
                terserOptions:{
                    // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
                    ecma:undefined,
                    mangle:{
                        // mangle options
                        properties:{
                            // mangle property options
                            //mangle all variables starting with underscore "_"
                            regex:/^_/
                        }
                    },
                }
            }),
        ],
    }
};