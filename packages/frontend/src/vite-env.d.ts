/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module 'microFrontend/MicroPage' {
  const MicroPage: React.ComponentType;
  export default MicroPage;
}
