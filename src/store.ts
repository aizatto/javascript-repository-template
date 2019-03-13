/* eslint-disable no-console */
import * as fs from 'fs';
import * as childProcess from 'child_process';
import * as path from 'path';

const branchName = 'dotfiles';
const remoteBranch = 'master';

abstract class Store {
  protected cwd: string;

  public abstract init(): void;

  public abstract isClean(): boolean;

  public abstract prepare(): void;

  public abstract revert(): void;

  public abstract commit(): void;

  public getCWD(): string {
    return this.cwd;
  }

  public execSync(command): string {
    console.log(command);
    return childProcess.execSync(
      command,
      {
        cwd: this.cwd,
      },
    ).toString().trim();
  }

}

export class FSStore extends Store {

  public constructor(config: {repository: string}) {
    super();
    this.cwd = config.repository.slice(7);
  }

  public init(): void {
  }

  public isClean(): boolean {
    return fs.existsSync(this.cwd);
  }

  public prepare(): void {
  }

  public revert(): void {
  }

  public commit(): void {
  }
}

export class GitSshStore extends Store {

  private repositoryUrl: string;

  public constructor(config: {repository: string}) {
    super();

    const repositoryUrl = config.repository;
    const firstSlash = repositoryUrl.indexOf('/');
    const dot = repositoryUrl.indexOf('.', firstSlash);
    const directory = repositoryUrl.substring(firstSlash + 1, dot);

    this.cwd = path.join('repositories', directory);
    this.repositoryUrl = config.repository;
  }

  public init(): void {
    if (!fs.existsSync(this.cwd)) {
      // TODO `repository` variable can be exploited, need to validate
      this.execSync(`git clone ${this.repositoryUrl}`);
    }
  }

  // From https://stackoverflow.com/questions/5139290/how-to-check-if-theres-nothing-to-be-committed-in-the-current-branch
  public isClean(): boolean {
    const output = this.execSync(`git status --porcelain`);
    return output.length === 0;
  }

  public prepare(): void {
    // Check git branch status
    const branch = this.execSync(`git rev-parse --abbrev-ref HEAD`);
    if (branch !== remoteBranch) {
      // console.log(`${repository} is not on branch: ${remoteBranch}`);
      // TODO check errors
      this.execSync(`git checkout ${remoteBranch}`);
    }

    // TODO check errors
    this.execSync(`git pull --rebase`);

    this.execSync(`git checkout -b ${branchName} ${remoteBranch}`);
  }

  public revert(): void {
    this.execSync(`git checkout ${remoteBranch}`);
    this.execSync(`git branch -d ${branchName}`);
  }

  public commit(): void {
    // Add files
    this.execSync(`git add .`);

    // Commit files
    const commitMessage = `dotfiles: sync with template repository`;

    this.execSync(`git commit -m '${commitMessage}'`);

  //  this.execSync(`git push --set-upstream origin ${branchName}`);
  //  const pullRequestUrl = this.execSync(`hub pull-request --no-edit`);
  //  console.log(pullRequestUrl);
  }
}

export function getStore(config): Store {
  if (config.repository.slice(0, 15) === 'git@github.com:') {
    return new GitSshStore(config);
  } if (config.repository.slice(0, 7) === 'file://') {
    return new FSStore(config);
  } 
    return null;
}
