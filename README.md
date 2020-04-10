# Gridworld Task
Simple raphael.js-based gridworld interface. Currently only has
very basic functionality.

## Use
The `gridworld-task.js` file is a compiled version of the task that can be used on its own. See `index.html` for an example.

## Developing
The code in `src` is written in es6, rather than javascript, and then built into the `gridworld-task.js` file so that it is compatible with older browsers.

Modifying the code requires node package manager [npm](https://www.npmjs.com/). 

To set up the package, once `npm` is installed:
```
npm install
```

To build `gridworld-task.js`:
```
npm run build
```

To build with source map:
```
npm run build-debug
```

To run a demo page:
```
npm run loaddemo
```
