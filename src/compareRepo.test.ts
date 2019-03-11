/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
import comparePackage from './compareRepo';

const { expect } = require('chai');

describe("compare repo", () => {
  it("should add new dev dependencies", () => {
    const result = comparePackage(
      {
      },
      [
        {
          "package.json": {
            "devDependencies": {
              "eslint-config-aizatto": "git+ssh://git@github.com:aizatto/eslint-config-aizatto.git#v0.0.1",
              "@types/chai": "^4.1.7",
              "@types/mocha": "^5.2.6",
              "chai": "^4.0.2",
              "mocha": "^3.4.2",
              "ts-node": "^8.0.2"
            }
          }
        }
      ],
    );
    expect(result.devDependenciesToAdd).to.not.be.empty;
  });

  it("should not add new dev dependencies", () => {
    const result = comparePackage(
      {
        "devDependencies": {
          "eslint-config-aizatto": "git+ssh://git@github.com:aizatto/eslint-config-aizatto.git#v0.0.1",
        }
      },
      [
        {
          "package.json": {
            "devDependencies": {
              "eslint-config-aizatto": "git+ssh://git@github.com:aizatto/eslint-config-aizatto.git#v0.0.1",
            }
          }
        }
      ],
    );
    expect(result.devDependenciesToAdd).to.be.empty;
  });

  it("should add new scripts", () => {
    const result = comparePackage(
      {
        "scripts": {
        }
      },
      [
        {
          "package.json": {
            "scripts": {
              "test": "yarn run mocha -r ts-node/register src/*.test.ts"
            }
          }
        }
      ],
    );
    expect(result.repositoryPackageJsonChanged).to.be.true;
    expect(result.repositoryPackageJson).to.deep.equal({
      "scripts": {
        "test": "yarn run mocha -r ts-node/register src/*.test.ts"
      }
    });
  });

  it("should use old scripts", () => {
    const OLD_SCRIPT = "old script";
    const NEW_SCRIPT = "old script";

    const result = comparePackage(
      {
        "scripts": {
          "test": OLD_SCRIPT,
        }
      },
      [
        {
          "package.json": {
            "scripts": {
              "test": NEW_SCRIPT,
            }
          }
        }
      ],
    );
    expect(result.repositoryPackageJsonChanged).to.be.false;
    expect(result.repositoryPackageJson).to.deep.equal({
      "scripts": {
        "test": OLD_SCRIPT,
      }
    });
  });
});
