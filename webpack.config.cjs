const { resolve } = require('path');

module.exports = env => {
  const target = env?.target === 'umd' ? 'es5' : 'es2015';
  const libraryTarget = env?.target === 'umd' ? 'umd' : 'commonjs';
  const library = env?.target === 'umd' ? 'tbABR' : undefined;

  return {
    mode: env?.dev ? 'development' : 'production',
    target,
    entry: './dist/index.js',
    output: {
      path: resolve(__dirname, 'dist'),
      filename: `index.${env?.target || 'cjs'}.js`,
      libraryTarget,
      library
    },
    module: {
      rules: [
        { test: /\.js$/, use: 'babel-loader', resolve: { fullySpecified: false } }
      ]
    }
  };
};
