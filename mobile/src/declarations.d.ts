// Ambient declarations for CSS imports used by the web target of the template.
declare module '*.css';
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
