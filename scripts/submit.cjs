#!/usr/bin/env node
// Submits your work for grading: pushes your commits, then a submit/<timestamp> tag.
// Classroom 50 grades every submit/ tag and publishes the result as a Release.
const { execFileSync } = require('node:child_process');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function submitTag(date = new Date()) {
  return 'submit/' + date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}

function main() {
  const changes = git('status', '--porcelain');
  if (changes) {
    console.error('You have uncommitted changes. Commit them first:');
    console.error('  git add .');
    console.error('  git commit -m "Describe your change"\n');
    console.error(changes);
    process.exit(1);
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  execFileSync('git', ['push', 'origin', branch], { stdio: 'inherit' });
  const tag = submitTag();
  execFileSync('git', ['tag', tag], { stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', tag], { stdio: 'inherit' });
  const url = git('remote', 'get-url', 'origin')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
  console.log(`\nSubmitted as ${tag}.`);
  console.log(`Your result appears within a few minutes under Releases: ${url}/releases`);
}

if (require.main === module) main();
module.exports = { submitTag };
