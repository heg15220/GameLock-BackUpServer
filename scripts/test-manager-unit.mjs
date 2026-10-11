import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = 'src/games/sports/manager';
const tests = readdirSync(resolve(root, directory)).filter(name => name.endsWith('.test.js')).sort()
  .map(name => `${directory}/${name}`);
if (process.argv.includes('--list')) {
  console.log(tests.join('\n'));
} else {
  // Each historical test file gets a fresh process. A combined Windows run can
  // abort natively after retaining several independently bundled large archives.
  const failures = [];
  for (const test of tests) {
    const result = spawnSync(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--threads=false'], { cwd: root, stdio: 'inherit' });
    if (result.error || result.signal) {
      console.error(result.error || `Prueba interrumpida: ${result.signal}`);
      process.exit(1);
    }
    if (result.status !== 0) failures.push(test);
  }
  if (failures.length) {
    console.error(`Archivos con fallos:\n${failures.join('\n')}`);
    process.exitCode = 1;
  } else console.log(`Mánager: ${tests.length} archivos de pruebas aprobados.`);
}
