import { z } from 'zod';

export const InputValidator = z.object({
  serverUri: z
    .string()
    .url()
    .transform((x) => (x.endsWith('/') ? x.slice(0, -1) : x)),
  authToken: z.string().min(1, 'required property is not set'),
  moduleName: z.string().min(1, 'required property is not set'),
  providerName: z.string().min(1, 'required property is not set'),
  organizationName: z.string().min(1, 'required property is not set'),
  versionString: z.string().min(1, 'required property is not set'),
  isNoCode: z.boolean(),
});

export type InputVars = z.infer<typeof InputValidator>;
