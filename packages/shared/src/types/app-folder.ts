export interface AppFolder {
  id: string;
  name: string;
  channelIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppFolderDto {
  name: string;
  channelIds?: string[];
}

export interface UpdateAppFolderDto {
  name?: string;
  channelIds?: string[];
}
