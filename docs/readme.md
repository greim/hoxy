# Documentation

Pages in this dir are used to generate the main documentation file. This:

```bash
npm run docs
```

...will create an `index.html` file in the root of this repo, which is gitignore'd.
In the `gh-pages` branch, however, it is NOT gitignored.
So generating docs entails:

 * merge `master` into `gh-pages`
 * change into the `gh-pages` branch
 * execute command: `npm run docs`
 * commit the changes
 * push to `origin/gh-pages`

`gh-pages` should only take merges, never be merged into other branches.
