import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Built demo bundles under src/blog/*-demo are generated output, not source.
  { ignores: ['src/blog/*-demo/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
