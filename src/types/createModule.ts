export interface CreateModuleResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      name: string;
      namespace: string;
      'registry-name': string;
      provider: string;
      status: string;
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      'version-statuses': any[];
      'created-at': string;
      'updated-at': string;
      permissions: {
        'can-delete': boolean;
        'can-resync': boolean;
        'can-retry': boolean;
      };
    };
    relationships: {
      organization: {
        data: {
          id: string;
          type: string;
        };
      };
    };
    links: {
      self: string;
    };
  };
}

export type CreateModuleRequest = {
  data: {
    type: string;
    attributes: {
      name: string;
      provider: string;
      namespace?: string;
      'registry-name': string;
      'no-code': boolean;
    };
  };
};
