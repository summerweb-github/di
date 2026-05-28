import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const typescriptPluginOptions = {
  tsconfig: './tsconfig.json',
  exclude: ['**/*.test.ts'],
};

const stripComments = terser({
  format: {
    comments: false,
    beautify: true,
  },
  compress: false,
  mangle: false,
});

const lightPlugins = (outDir) => [
  typescript({
    ...typescriptPluginOptions,
    declaration: false,
    compilerOptions: {
      outDir,
      noEmit: false,
    },
  }),
  terser({
    format: {
      comments: false,
    },
    compress: {
      passes: 2,
    },
    mangle: true,
  }),
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: 'hidden',
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: 'hidden',
      },
    ],
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        ...typescriptPluginOptions,
        declaration: true,
        declarationDir: 'dist/types',
      }),
      stripComments,
    ],
  },
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist-light-esm/index.js',
      format: 'esm',
      sourcemap: false,
    },
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: lightPlugins('dist-light-esm'),
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist-light-cjs/index.cjs',
      format: 'cjs',
      sourcemap: false,
      exports: 'auto',
    },
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: lightPlugins('dist-light-cjs'),
  },
];
