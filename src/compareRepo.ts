import * as isEqual from 'lodash.isequal';

function mergeConfig(source, destination) {
  if (!source) {
    return [destination, false];
  }

  const merged = {...source, ...destination}
  const changed = !isEqual(destination, merged);
  return [merged, changed];
}

function compareDependencies(source, destination) {
  const toAdd = [];
  const toRemove = [];

  if (!source) {
    return [toAdd, toRemove];
  }

  Object.keys(source).forEach((pkg) => {
    const expectedVersion = source[pkg];
    const currentVersion = destination[pkg];

    if (expectedVersion === "latest") {
      if (currentVersion) {
        toRemove.push(pkg);
      }
      toAdd.push(pkg);
      return;
    } if (currentVersion) {
      // TODO How should we handle versions
      return;
    }

    if (expectedVersion.slice(0, 10) === 'git+ssh://') {
      toAdd.push(expectedVersion);
    } else {
      toAdd.push(`${pkg}@${expectedVersion}`);
    }
  });

  return [toAdd, toRemove];
};

export default function comparePackage(argRepositoryPackageJson, templates) {
  const fileInstructions = [];
  const repositoryPackageJson = {...argRepositoryPackageJson};
  let repositoryPackageJsonChanged = false;

  const dependencies = repositoryPackageJson.dependencies || {};
  const devDependencies = repositoryPackageJson.devDependencies || {};

  let dependenciesToAdd = [];
  let dependenciesToRemove = [];
  let devDependenciesToAdd = [];
  let devDependenciesToRemove = [];

  let toAdd = [];
  let toRemove = [];

  templates.forEach((template) => {
    if (template.files &&
        template.files.length) {
      template.files.forEach(({source, destination}) => {
        fileInstructions.push({
          source,
          destination,
        });
      });
    }

    if (!template["package.json"]) {
      return;
    }

    ["scripts", "husky"].forEach(key => {
      const [config, changed] = mergeConfig(
        template["package.json"][key],
        repositoryPackageJson[key],
      );
      if (changed) {
        repositoryPackageJson[key] = config;
        repositoryPackageJsonChanged = true;
      }
    });

    if (template["package.json"].dependencies) {
      [toAdd, toRemove] = compareDependencies(
        template["package.json"].dependencies,
        dependencies,
      );

      dependenciesToAdd.push(...toAdd);
      dependenciesToRemove.push(...toRemove);
    }

    if (template["package.json"].devDependencies) {
      [toAdd, toRemove] = compareDependencies(
        template["package.json"].devDependencies,
        devDependencies,
      );

      devDependenciesToAdd.push(...toAdd);
      devDependenciesToRemove.push(...toRemove);
    }

  });

  return {
    fileInstructions,
    repositoryPackageJson,
    repositoryPackageJsonChanged,
    dependenciesToAdd,
    dependenciesToRemove,
    devDependenciesToAdd,
    devDependenciesToRemove,
  }
}
