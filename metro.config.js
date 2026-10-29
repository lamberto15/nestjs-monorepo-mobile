// https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The copied API client (src/api/client, `pnpm client:sync`) is TypeScript
// written for Node's module resolution: its relative imports name the `.js`
// a `.ts` file compiles to. Metro looks for the `.js` file itself, so here
// those imports drop the extension. The copy stays byte-for-byte the
// backend's (`pnpm client:check`).
const clientDir = path.join(__dirname, 'src', 'api', 'client') + path.sep;
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const name =
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    context.originModulePath.startsWith(clientDir)
      ? moduleName.slice(0, -'.js'.length)
      : moduleName;
  return (resolveRequest ?? context.resolveRequest)(context, name, platform);
};

module.exports = config;
