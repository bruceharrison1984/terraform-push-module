import { debug, getInput, setFailed } from '@actions/core';
import { ZodError } from 'zod';
import { run } from './main';
import { InputValidator, type InputVars } from './types/inputVars';

const input: InputVars = {
  serverUri: getInput('serverUri'),
  authToken: getInput('authToken'),
  moduleName: getInput('moduleName'),
  providerName: getInput('providerName'),
  organizationName: getInput('organizationName'),
  versionString: getInput('versionString'),
  isNoCode: getInput('isNoCode').toLowerCase() === 'true',
};

try {
  const validatedInput = InputValidator.parse(input);
  debug(JSON.stringify(validatedInput, null, 2));
  run(validatedInput);
} catch (err) {
  if (err instanceof ZodError)
    setFailed(JSON.stringify(err.flatten().fieldErrors, null, 2));
}
