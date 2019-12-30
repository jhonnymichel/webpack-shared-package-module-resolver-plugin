const logging = require('webpack/lib/logging/runtime');

class SharedPackageModuleResolverPlugin {
  constructor(config) {
    this.appsPath = config.packagesPath;
    this.appToProxy = config.sharedPackage;
    this.currentAppParser = new RegExp(`${this.appsPath}\/((?!${this.appToProxy}).*\/)`);
    this.libRequesters = {};
  }

  parseCurrentApp(requestIssuer) {
    const [fullMatch, appName] = this.currentAppParser.exec(requestIssuer || '') || [];
    if (appName) {
      const [currentApp] = appName.split('/');
      return currentApp;
    }

    return null;
  }

  getRootRequester(request) {
    let requester = this.libRequesters[request.context.issuer];
    if (!requester) {
      const parsedPath = path.parse(request.context.issuer);
      requester = this.libRequesters[`${parsedPath.dir}/${parsedPath.name}`];
    }

    return requester;
  }

  getRequesterPath(request) {
    const parsedPath = path.parse(request);
    return parsedPath.dir;
  }

  apply(resolver) {
    const source = 'resolve';
    const target = resolver.ensureHook('parsed-resolve');
    const logger = logging.getLogger('SharedPackageModuleResolverPlugin');

    resolver
      .getHook(source)
      .tapAsync('SharedPackageModuleResolverPlugin', (request, resolveContext, callback) => {
        if (request.request.startsWith(`${this.appToProxy}/`)) {
          this.libRequesters[path.join(this.appsPath, request.request)] = request.context.issuer;
        }

        if ((request.context.issuer || '').includes(path.join(this.appsPath, this.appToProxy))) {
          const rootRequester = this.getRootRequester(request);

          if (request.request.startsWith('./')) {
            const rootRequesterPath = this.getRequesterPath(request.context.issuer);
            this.libRequesters[path.join(rootRequesterPath, request.request)] = rootRequester;
          }

          if (request.request.startsWith(`${this.appToProxy}/`)) {
            this.libRequesters[path.join(this.appsPath, request.request)] = rootRequester;
          }

          if (
            !request.request.startsWith('./') &&
            !request.request.startsWith(`${this.appToProxy}/`)
          ) {
            if (!rootRequester) {
              logger.error(
                "Couldn't find root issuer for module:",
                request.context.issuer,
                '- Module requested:',
                request.request
              );
              return resolver.doResolve(target, request, null, resolveContext, callback);
            }

            const obj = {
              ...request,
              request: path.join(
                this.appsPath,
                this.parseCurrentApp(rootRequester),
                'node_modules',
                request.request
              )
            };
            return resolver.doResolve(target, obj, null, resolveContext, callback);
          }
        }
        return resolver.doResolve(target, request, null, resolveContext, callback);
      });
  }
}

module.exports = SharedPackageModuleResolverPlugin;
