declare module "mammoth/mammoth.browser.js" {
  interface Result {
    value: string;
    messages: Array<{ type: "warning" | "error"; message: string }>;
  }

  const mammoth: {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<Result>;
  };

  export default mammoth;
}
