var path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
var webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: ["./src/index.ts", "./src/index.html"],
  devtool: "source-map",
  //don't need devServer options. These are default option.s
  devServer: {
    contentBase: "./",
    publicPath: "/bin/",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(jpe?g|png|svg|gif)$/,
        use: {
          loader: "file-loader",
          options: {
            outputPath: "images",
            publicPath: "bin/images",
          },
        },
      },
      {
        test: /\.html/,
        use: "file-loader?name=[name].[ext]",
      },
    ],
  },

  plugins: [
    //copy the assets folder from src to the build folder
    new CopyPlugin([
      { context: "src/", from: "assets/**/*" },
      { context: "src/", from: "lib/**/*" },
    ]),
  ],
  //   externals: {
  //     oimo: "OIMO", //or true
  //     cannon: "CANNON" //or true
  //   },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "bin"),
  },
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
