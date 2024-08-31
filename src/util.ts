import { stat } from 'node:fs/promises';
import { info } from '@actions/core';
import { glob } from 'glob';
import { create } from 'tar';

/**
 * Package a standard module. The resulting file name will be `module.tgz`
 */
export const packageModule = async () => {
  const outputFilename = './module.tgz';
  const moduleFiles = await glob(['**/*.tf', '**/README.md'], {
    ignore: '.terraform/**',
  });

  info('\n=== module contents ===');
  info(moduleFiles.join('\n'));
  await create({ gzip: true, file: outputFilename }, moduleFiles);
  const moduleInfo = await stat(outputFilename);
  info(`=== archive size: ${moduleInfo.size / 1024}kb ===\n`);

  return outputFilename;
};
