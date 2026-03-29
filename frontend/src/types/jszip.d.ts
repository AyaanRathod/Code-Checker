declare module 'jszip' {
  export interface JSZipObject {
    dir: boolean;
    name: string;
    async(type: 'uint8array'): Promise<Uint8Array>;
  }

  export interface JSZipArchive {
    forEach(callback: (relativePath: string, zipEntry: JSZipObject) => void): void;
  }

  const JSZip: {
    loadAsync(data: Blob | ArrayBuffer | Uint8Array): Promise<JSZipArchive>;
  };

  export default JSZip;
}
