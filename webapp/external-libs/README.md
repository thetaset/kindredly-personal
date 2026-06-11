# External libs (webapp runtime)

This directory is for webapp-only runtime-loaded libraries used by `ImageClassificationService`.

Expected files:

- `tfjs/tf.min.js`
- `tfjs/tf-backend-wasm.min.js`
- `nsfwjs/nsfwjs.min.js`

Load behavior:

- `APP_TYPE=webapp`: tries these files first, then falls back to bundled dynamic imports.
- non-webapp builds (`extension`, `android`, `ios`, `electron`): this folder is stripped from build output by Vite.
