/* eslint-disable no-console */
import * as fs from 'fs';
import comparePackage from './compareRepo';

const childProcess = require('child_process');
const path = require('path');

const branchName = 'dotfiles';

const remoteBranch = 'master';

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

  const repositoryUrl = repositoryConfig.repository;
  const firstSlash = repositoryUrl.indexOf('/');
  const dot = repositoryUrl.indexOf('.', firstSlash);
  const directory = repositoryUrl.substring(firstSlash + 1, dot);
  const fullPath = path.join('repositories', directory);

  if (!fs.existsSync(fullPath)) {
    // TODO `repository` variable can be exploited, need to validate
    childProcess.execSync(
      `git clone ${repositoryUrl}`,
      {
        cwd: 'repositories',
      },
    );
  }

  const execSync = (command) => {
    console.log(command);
    return childProcess.execSync(
      command,
      {
        cwd: fullPath,
      },
    ).toString().trim();
  };

  // From https://stackoverflow.com/questions/5139290/how-to-check-if-theres-nothing-to-be-committed-in-the-current-branch
  let output = execSync(`git status --porcelain`);
  if (output.length !== 0) {
    console.log(`${fullPath} is not clean`);
    return;
  }

  // Check git branch status
  const branch = execSync(`git rev-parse --abbrev-ref HEAD`);
  if (branch !== remoteBranch) {
    // console.log(`${repository} is not on branch: ${remoteBranch}`);
    // TODO check errors
    execSync(`git checkout ${remoteBranch}`);
  }

  // TODO check errors
  execSync(`git pull --rebase`);

  execSync(`git checkout -b ${branchName} ${remoteBranch}`);

  const configs = repositoryConfig.files.map((source) => {
    const sourceConfig = config.files.find(c => c.source === source);
    if (!sourceConfig) {
      console.error(`config does not exist for: ${source}`);
      return null;
    }
    return sourceConfig;
  }).filter(config2 => !!config2);

  const repositoryPackageJsonPath = path.join(fullPath, 'package.json');
  const repositoryPackageJsonExists = fs.existsSync(repositoryPackageJsonPath);
  const oldRepositoryPackageJson = repositoryPackageJsonExists
    ? JSON.parse(fs.readFileSync(repositoryPackageJsonPath).toString())
    : {};

  const {
    fileInstructions,
    repositoryPackageJsonChanged,
    devDependenciesToAdd,
    repositoryPackageJson: newRepositoryPackageJson,
  } = comparePackage(oldRepositoryPackageJson, configs);

  fileInstructions.forEach(({ source, destination}) => {
    const sourcePath = path.resolve('config', source);
    const destinationPath = path.join(fullPath, destination);
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
    const packageManager = fs.existsSync(path.join(fullPath, 'package.lock'))
      ? PackageManager.NPM
      : PackageManager.YARN;

    // eslint-disable-next-line default-case
    switch (packageManager) {
      case PackageManager.YARN:
        execSync(`yarn add --dev ${devDependenciesToAdd.join(' ')}`);
        break;

      case PackageManager.NPM:
        execSync(`npm install --only=dev ${devDependenciesToAdd.join(' ')}`);
        break;
    }
  }

  output = execSync(`git status --porcelain`);
  if (output.length === 0) {
    console.log(`No changes to repository, continuing`);
    execSync(`git checkout ${remoteBranch}`);
    return;
  }

  // Add files
  execSync(`git add .`);

  // Commit files
  const commitMessage = `dotfiles: sync with template repository`;

  execSync(`git commit -m '${commitMessage}'`);

//  execSync(`git push --set-upstream origin ${branchName}`);
//  const pullRequestUrl = execSync(`hub pull-request --no-edit`);
//  console.log(pullRequestUrl);
  console.log();
})
