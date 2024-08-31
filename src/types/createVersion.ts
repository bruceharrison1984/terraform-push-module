export type CreateVersionRequest = {
  data: {
    type: string;
    attributes: {
      version: string;
      'commit-sha': string;
    };
  };
};

export interface CreateVersionResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      source: string;
      status: string;
      version: string;
      'created-at': string;
      'updated-at': string;
    };
    relationships: {
      'registry-module': {
        data: {
          id: string;
          type: string;
        };
      };
    };
    links: {
      upload: string;
    };
  };
}
