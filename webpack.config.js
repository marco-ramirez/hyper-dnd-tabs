const path = require('path');

module.exports = (env, argv) => {
    const config = {
        entry: './lib/index.js',
        output: {
            path: path.join(__dirname, 'build'),
            filename: 'bundle.js',
            libraryTarget: 'commonjs'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader'
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: 'style-loader'
                        },
                        {
                            loader: 'css-loader',
                            options: {modules: true}
                        }
                    ]
                }
            ]
        },
        target: 'electron-renderer'
    };

    if (argv.mode === 'development') {
        config.devtool = 'cheap-source-map';
    }

    return config;
};
