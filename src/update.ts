/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import comparePackage from './compareRepo';
import {getStore} from './store';

/* eslint-disable no-unused-vars */
const enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
}
/* eslint-enable no-unused-vars */

const config = JSON.parse(fs.readFileSync('./repositories.json').toString());

/**
 * TODO:
 *
 * * Error checking on each of the git commands
 * * Returning to a safe state
 * * Remote branch name can be something else besides "master"
 * * Make branch name dynamic
 * * Check for collisions of branch name
 * * Include a decent commit message
 */
config.repositories.forEach(unmergedRepositoryConfig => {
  const repositoryConfig = {...config.defaults, ...unmergedRepositoryConfig};
  if (repositoryConfig.skip) {
    console.log(`Skipping ${repositoryConfig.repository}`);
    return;
  }

  console.log(repositoryConfig);

  const repository = getStore(repositoryConfig);
  if (!repository) {
    console.log(`Unsupported repository: ${repositoryConfig.repository}`);
    return;
  }

  repository.init();

  if (!repository.isClean()){
    console.log(`${repository.getCWD()} is not clean`);
    return;
  }

  repository.prepare();

  const templates = repositoryConfig.templates.map((name) => {
    const template = config.templates.find(c => c.name === name);
    if (!template) {
      console.error(`template does not exist for: ${name}`);
      return null;
    }
    return template;
  }).filter(config2 => !!config2);

  const repositoryPackageJsonPath = path.join(repository.getCWD(), 'package.json');
  const repositoryPackageJsonExists = fs.existsSync(repositoryPackageJsonPath);
  const oldRepositoryPackageJson = repositoryPackageJsonExists
    ? JSON.parse(fs.readFileSync(repositoryPackageJsonPath).toString())
    : {};

  const {
    fileInstructions,
    repositoryPackageJsonChanged,
    devDependenciesToAdd,
    devDependenciesToRemove,
    repositoryPackageJson: newRepositoryPackageJson,
  } = comparePackage(oldRepositoryPackageJson, templates);

  fileInstructions.forEach(({ source, destination}) => {
    const sourcePath = path.resolve('config', source);
    const destinationPath = path.join(repository.getCWD(), destination);
    fs.copyFileSync(sourcePath, destinationPath);
  });

  // Create the package.json before anything else
  if (repositoryPackageJsonChanged) {
    fs.writeFileSync(repositoryPackageJsonPath, `${JSON.stringify(newRepositoryPackageJson, null, 2)  }\n`);
  }

  if (devDependenciesToAdd.length > 0) {
    if (!repositoryPackageJsonExists && !repositoryPackageJsonChanged) {
      fs.writeFileSync(repositoryPackageJsonPath, '{}');
    }
    const packageManager = fs.existsSync(path.join(repository.getCWD(), 'package.lock'))
      ? PackageManager.NPM
      : PackageManager.YARN;

    // eslint-disable-next-line default-case
    switch (packageManager) {
      case PackageManager.YARN:
        if (devDependenciesToRemove.length) {
          repository.execSync(`yarn remove ${devDependenciesToRemove.join(' ')}`);
        }
        repository.execSync(`yarn add --dev ${devDependenciesToAdd.join(' ')}`);
        break;

      case PackageManager.NPM:
        if (devDependenciesToRemove.length) {
          repository.execSync(`npm remove ${devDependenciesToRemove.join(' ')}`);
        }
        repository.execSync(`npm install --only=dev ${devDependenciesToAdd.join(' ')}`);
        break;
    }
  }

  if (repository.isClean()) {
    console.log(`No changes to repository, continuing`);
    repository.revert();
    return;
  }

  console.log();
})
