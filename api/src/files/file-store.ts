export interface FileStore {
  presignPut(key: string, mime: string, size: number): Promise<string>;
  presignGet(key: string): Promise<string>;
}
