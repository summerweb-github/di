import { readFileSync, writeFileSync } from 'node:fs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));

const sharedFields = {
  version: rootPackage.version,
  description: rootPackage.description,
  keywords: rootPackage.keywords,
  author: rootPackage.author,
  license: rootPackage.license,
  repository: rootPackage.repository,
};

writeFileSync(
  'dist-light-esm/package.json',
  `${JSON.stringify(
    {
      name: '@smwb/di-light-esm',
      ...sharedFields,
      type: 'module',
      main: './index.js',
      exports: {
        '.': './index.js',
      },
      files: ['index.js'],
    },
    null,
    2
  )}\n`
);

writeFileSync(
  'dist-light-cjs/package.json',
  `${JSON.stringify(
    {
      name: '@smwb/di-light-cjs',
      ...sharedFields,
      main: './index.cjs',
      exports: {
        '.': './index.cjs',
      },
      files: ['index.cjs'],
    },
    null,
    2
  )}\n`
);
