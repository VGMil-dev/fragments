import { TextTransformer, ElementTransformer } from "@lexical/markdown";
import {
  $createFragmentNode,
  $isFragmentNode,
  FragmentNode,
} from "../nodes/fragment-node";
import { $createParagraphNode, LexicalNode } from "lexical";

export const FRAGMENT_TRANSFORMER: ElementTransformer = {
  dependencies: [FragmentNode],
  export: (node: LexicalNode) => {
    if (!$isFragmentNode(node)) {
      return null;
    }
    return node.getContent();
  },
  regExp: /^::(quiz|code)[\s\S]*?::end$/,
  replace: (parentNode, children, _match, isDirty) => {
    // This is for element transformers, but our blocks are multi-line.
    // Lexical's default transformers are mostly single-line or specific markers.
    // For multiline blocks, we might need a more custom approach or use the text transformer.
    return;
  },
  type: "element",
};

// A better way to handle multiline custom blocks in Lexical Markdown is often 
// via custom plugins that post-process the string or by using text transformers 
// if they fit. However, for "::block ... ::end", we can try to match it.

export const FRAGMENT_TEXT_TRANSFORMER: TextTransformer = {
  dependencies: [FragmentNode],
  importRegExp: /(::(?:quiz|code)[\s\S]*?::end)/,
  regExp: /(::(?:quiz|code)[\s\S]*?::end)/,
  replace: (textNode, match) => {
    const [, content] = match;
    const fragmentNode = $createFragmentNode(content);
    textNode.replace(fragmentNode);
  },
  trigger: ":",
  type: "text",
};
