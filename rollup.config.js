import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'dist/index.js',
    output: [
      {
        file: 'dist/cjs/index.js',
        format: 'cjs'
      },
      {
        file: 'dist/fesm2015/index.js',
        format: 'es'
      }
    ],
    plugins: [terser({ output: { max_line_len: 511 } })]
  }
];
