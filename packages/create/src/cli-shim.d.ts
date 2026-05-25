declare module "@silicajs/cli" {
  export function createCommand(directory: string): Promise<void>;
}
