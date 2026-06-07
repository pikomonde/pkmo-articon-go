// Make TypeScript understand import that ended with "?script" (CRXJS)
declare module '*?script' {
  const src: string;
  export default src;
}
