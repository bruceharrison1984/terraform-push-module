import { readFile } from 'node:fs/promises';
import { exit } from 'node:process';
import {
  ExitCode,
  debug,
  info,
  setFailed,
  setOutput,
  summary,
} from '@actions/core';
import { context as ghContext } from '@actions/github';
import { TFEClient } from './tfeClient';
import type { CreateVersionResponse } from './types/createVersion';
import type { InputVars } from './types/inputVars';
import { packageModule } from './util';

export const run = async ({
  serverUri,
  authToken,
  moduleName,
  providerName,
  organizationName,
  versionString,
  isNoCode,
}: InputVars) => {
  const createModuleUri = 'registry-modules';
  const getModuleUri = `${createModuleUri}/private/${organizationName}/${moduleName}/${providerName}`;
  const createVersionUri = `${getModuleUri}/versions`;

  const client = new TFEClient(
    `${serverUri}/api/v2/organizations/${organizationName}`,
    authToken,
  );

  info(`checking if module ${moduleName} already exists...`);
  const getModule = await client.getModule(getModuleUri);

  if (getModule.status === 404) {
    await client.createModule(createModuleUri, {
      data: {
        type: 'registry-modules',
        attributes: {
          name: moduleName,
          provider: providerName,
          'registry-name': 'private', // hard-coded to private modules
          'no-code': isNoCode,
        },
      },
    });
  } else {
    info(`module ${moduleName} already exists, continuing...\n`);
  }

  const createVersionRaw = await client.createVersion(createVersionUri, {
    data: {
      type: 'registry-module-versions',
      attributes: {
        version: versionString,
        'commit-sha': ghContext.sha,
      },
    },
  });

  const createVersionResp =
    (await createVersionRaw.json()) as CreateVersionResponse;
  const uploadUrl = createVersionResp.data.links.upload;

  debug(`upload url for ${moduleName}@${versionString}: ${uploadUrl}`);

  /** This is the version number as interpreted by TFE */
  const onServerVersion = createVersionResp.data.attributes.version;
  debug(`server transformed version number: '${onServerVersion}'`);
  const deleteVersionUri = `${createModuleUri}/private/${organizationName}/${moduleName}/${providerName}/${onServerVersion}`;

  const archivePath = await packageModule();

  /**
   * From here, if we fail during upload we will delete the version we created
   * This should be a safe operation because we created the version in this context
   */
  try {
    const readStream = await readFile(archivePath); // we're loading the module into memory, but that should be fine since TF modules aren't very large
    await client.uploadVersion(uploadUrl, readStream);
  } catch (err) {
    await client.deleteVersion(deleteVersionUri);
    setFailed(
      `module push failed after creating version ${onServerVersion}. the failed module version ${onServerVersion} has been removed from the server to prevent future runs from conflicting.`,
    );
    exit(ExitCode.Failure);
  }

  setOutput('archiveFilepath', archivePath);
  setOutput('moduleName', moduleName);
  setOutput('moduleVersion', onServerVersion);

  summary
    .addHeading('Module Details', 2)
    .addTable([
      [
        { data: 'Property', header: true },
        { data: 'Value', header: true },
      ],
      ['Server URI', serverUri],
      ['Organization', organizationName],
      ['Provider', providerName],
      ['Module Name', moduleName],
      ['Module Version', onServerVersion],
      ['No Code Enabled', isNoCode ? 'Yes' : 'No'],
    ])
    .addHeading('Registry Link', 2)
    .addLink(
      `${serverUri}/app/${organizationName}/registry/modules/private/${organizationName}/${moduleName}/${providerName}/${onServerVersion}`,
      `${serverUri}/app/${organizationName}/registry/modules/private/${organizationName}/${moduleName}/${providerName}/${onServerVersion}`,
    )
    .write();
};
