var path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
var webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: ["./src/index.ts", "./src/index.html"],
  devtool: "source-map",
  devServer: {
    devMiddleware: {
      publicPath: "/bin/",
    },
    static: {
      directory: "./",
      serveIndex: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: [/node_modules/, /\.test\.ts$/],
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
    new CopyPlugin({
      patterns: [
        { context: "src/", from: "assets/**/*" },
        { context: "src/", from: "lib/**/*" },
      ],
    }),
  ],
  //   externals: {
  //     oimo: "OIMO", //or true
  //     cannon: "CANNON" //or true
  //   },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    // The babylonjs-charactercontroller dependency is consumed via a `file:`
    // symlink to the sibling checkout while CC 0.5.1 is unpublished. Without the
    // settings below, webpack resolves the CC bundle's externalized
    // `require("babylonjs")` against the SYMLINK TARGET's node_modules, pulling
    // in a SECOND copy of babylonjs. Two copies means two distinct `Mesh`
    // classes, so `instanceof Mesh` checks inside the CharacterController (e.g.
    // in setCharacter / _findSkel) fail for meshes created with Vishva's
    // babylonjs — which surfaced as "root node of the mesh provided is not a
    // mesh" and a missing avatar skeleton.
    //
    // `symlinks: false` makes webpack resolve modules through the symlink as if
    // the package lived in Vishva's own node_modules, and the explicit aliases
    // pin every babylonjs-family package to Vishva's single copy. Together they
    // guarantee one babylonjs instance across the app and the linked library.
    symlinks: false,
    alias: {
      babylonjs: path.resolve(__dirname, "node_modules/babylonjs"),
      "babylonjs-gui": path.resolve(__dirname, "node_modules/babylonjs-gui"),
      "babylonjs-loaders": path.resolve(__dirname, "node_modules/babylonjs-loaders"),
      "babylonjs-materials": path.resolve(__dirname, "node_modules/babylonjs-materials"),
      "babylonjs-serializers": path.resolve(__dirname, "node_modules/babylonjs-serializers"),
    },
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
