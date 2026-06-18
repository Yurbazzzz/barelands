const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isDev = process.env.NODE_ENV === 'development';

const pagesDir = path.resolve(__dirname, 'src/pages');
const pageFiles = fs.existsSync(pagesDir)
  ? fs.readdirSync(pagesDir).filter((file) => file.endsWith('.html'))
  : [];
const pagePlugins = pageFiles.map((file) => new HtmlWebpackPlugin({
  template: `./src/pages/${file}`,
  filename: `pages/${file}`,
  minify: isDev ? false : {
    removeComments: true,
    collapseWhitespace: true,
  },
}));

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/main.[contenthash:8].js',
    publicPath: '/',
    clean: true,
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]'
  },
  
  mode: isDev ? 'development' : 'production',
  
  devtool: isDev ? 'source-map' : false,
  
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
      publicPath: '/',
    },
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: isDev,
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: isDev,
              api: 'modern',
              sassOptions: {
                outputStyle: isDev ? 'expanded' : 'compressed',
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: 'index.html',
  minify: isDev ? false : {
    removeComments: true,
    collapseWhitespace: true
  },
    }),
    ...pagePlugins,
    new MiniCssExtractPlugin({
      filename: 'css/main.[contenthash:8].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'src/images'), to: 'images' }
      ]
    })
  ],
  
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    }
  }
};
