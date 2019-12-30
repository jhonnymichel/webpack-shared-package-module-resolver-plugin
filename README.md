# Webpack SharedPackageModuleResolverPlugin

This is a webpack resolve plugin for a very specific case: When you're running multiple packages into a single project (a monorepo) and want one of the packages to rely on the dependencies of the other packages.

## Reasoning
Consider this monorepo project structure:

```
packages/
├── appA/
│   ├── node_modules/
│   │   ├── react@17.0.0
│   │   └── lodash@5.0.0
│   └── app.js
│
├── appB/
│   ├── node_modules/
│   │   ├── react@15.0.0
│   │   └── lodash@5.0.0
│   └── app.js
│
└── lib/
    ├── card.js
    └── button.js
```

- appA uses react 17 and lodash 5
- appB uses react 15 and lodash 5
- lib is a package of reusable components
- appA/app.js imports lib/card.js
- appB/app.js also imports lib/card.js
- lib/card.js imports react and lodash

### The outcome without this plugin:

- lib/ has to install its own dependencies or rely on the root node_modules folder
- in the case of react, appA and appB are using different versions, so lib/ will be incompatible with one of them.
- in the case of lodash, appA and appB are using the same version, but lib/ can't use them. we'll endup with two copies of the same lodash version in the bundle

### The outcome with this plugin:

- lib/ does not have to install its own dependencies
- when requested by appA, lib/* will resolve its modules from appA
- when requested by appB, lib/* will resolve its modules from appB
- we solve both issues: no duplicated lodash and no conflicting react versions

## Instalation
`npm install --save-dev shared-package-module-resolver-plugin`

## Usage
```javascript
import SharedPackageModuleResolverPlugin from 'shared-package-module-resolver-plugin'

module.exports = {
  ...
  resolve: {
    // note this is a resolver plugin, so it goes inside resolve.plugins, not inside the main plugin object
    plugins: [new SharedPackageModuleResolverPlugin({
      packagesPath: path.join(__dirname, 'packages') // This has to be the absolute path!,
      sharedPackage: 'lib', // do not add slashes or anything else. just the name of the package
    })]
  }
}
```
