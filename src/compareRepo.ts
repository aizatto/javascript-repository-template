import * as isEqual from 'lodash.isequal';

export default function comparePackage(argRepositoryPackageJson, configs) {
  const fileInstructions = [];
  const repositoryPackageJson = {...argRepositoryPackageJson};
  let repositoryPackageJsonChanged = false;

  const devDependencies = repositoryPackageJson.devDependencies || {};
  const devDependenciesToAdd = [];
  const devDependenciesToRemove = [];

  configs.forEach((config) => {
    if (config.destination) {
      fileInstructions.push({
        source: config.source,
        destination: config.destination,
      });
    }

    if (!config["package.json"]) {
      return;
    }

    if (config["package.json"].scripts) {
      const newScriptsConfig = {...config["package.json"].scripts, ...repositoryPackageJson.scripts}
      if (!isEqual(repositoryPackageJson.scripts, newScriptsConfig)) {
        repositoryPackageJsonChanged = true;
        repositoryPackageJson.scripts = newScriptsConfig;
      }
    }
      
    if (!config["package.json"].devDependencies) {
      return;
    }

    Object.keys(config["package.json"].devDependencies).forEach((pkg) => {
      const expectedVersion = config["package.json"].devDependencies[pkg];
      const currentVersion = devDependencies[pkg];

      if (expectedVersion === "latest") {
        if (currentVersion) {
          devDependenciesToRemove.push(pkg);
        }
        devDependenciesToAdd.push(pkg);
        return;
      } else if (currentVersion) {
        // TODO How should we handle versions
        return;
      }

      if (expectedVersion.slice(0, 10) === 'git+ssh://') {
        devDependenciesToAdd.push(expectedVersion);
      } else {
        devDependenciesToAdd.push(`${pkg}@${expectedVersion}`);
      }
    })
  });

  return {
    fileInstructions,
    repositoryPackageJson,
    repositoryPackageJsonChanged,
    devDependenciesToAdd,
    devDependenciesToRemove,
  }
}
