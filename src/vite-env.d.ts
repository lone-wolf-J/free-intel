/// <reference types="vite/client" />

declare module "*.sql" {
  const content: string;
  export default content;
}
