#!/usr/bin/env node
/*
 * Writes the static character files in /assets/characters/ from js/eagle.js,
 * so the SVG files and the live rig are always the same art.
 *
 *   node tools/export-characters.js
 *
 * Not a build step: the site never needs this to run. Re-run it only after
 * editing the art in js/eagle.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const EagleRig = require('../js/eagle.js');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'characters');
const plumageDir = path.join(outDir, 'plumage');
fs.mkdirSync(plumageDir, { recursive: true });

const header = (label) =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!-- EAGLES GON EAT — ' + label + '. Generated from js/eagle.js by tools/export-characters.js. -->\n';

let count = 0;

EagleRig.POSES.concat(EagleRig.CAST).forEach((name) => {
  const svg = EagleRig.render(name, { uid: 'e', canonicalIds: EagleRig.POSES.includes(name), intrinsic: true });
  fs.writeFileSync(path.join(outDir, name + '.svg'), header(EagleRig.meta(name).label) + svg + '\n');
  count++;
});

for (let stage = 0; stage <= 6; stage++) {
  const svg = EagleRig.renderHead(stage, { uid: 'h', intrinsic: true });
  fs.writeFileSync(path.join(plumageDir, 'stage-' + stage + '.svg'), header('plumage stage ' + stage) + svg + '\n');
  count++;
}

// Scene 3's drone shot: him from directly above, flying up the screen.
fs.writeFileSync(path.join(outDir, 'flying-topdown.svg'), header('flying, seen from above') + EagleRig.renderTopDown({ uid: 't', hero: true, intrinsic: true }) + '\n');
count++;

// Favicon: the stage-0 head, the way everyone first meets him.
fs.writeFileSync(path.join(root, 'assets', 'favicon.svg'), EagleRig.renderHead(0, { uid: 'f', title: 'EAGLES GON EAT', intrinsic: true }) + '\n');
count++;

console.log('Wrote ' + count + ' SVG files.');
