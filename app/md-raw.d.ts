/**
 * Vite serves `?raw` imports as strings. TypeScript does not know that on its
 * own, and pulling in `vite/client` through `compilerOptions.types` would replace
 * the default type resolution this project relies on, so the one shape actually
 * used is declared here instead.
 */
declare module "*.md?raw" {
  const contents: string;
  export default contents;
}
