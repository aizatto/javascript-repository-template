/* eslint-disable no-console */
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./repositories.json').toString());

const markdown = config.templates.map(template => {
  const pkgJson = template['package.json'];
  if (!pkgJson) {
    return null;
  }

  const devDependencies = Object.keys(pkgJson.devDependencies).map((pkg) => {
    const version = pkgJson.devDependencies[pkg];
    if (version === 'latest') {
      return pkg;
    }

    if (version.slice(0, 10) === 'git+ssh://') {
      return version;
    } else {
      return `${pkg}@${version}`;
    }
  }).join(' ');

  return `# ${template.name}

\`\`\`sh
yarn add --dev ${devDependencies}
\`\`\`
`
}).join("\n");

fs.writeFileSync('Config.md', markdown);
