import * as FileSystem from 'expo-file-system/legacy';

export async function persistCustomCover(uri: string): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) return uri;

  const directory = `${documentDirectory}custom-covers/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
