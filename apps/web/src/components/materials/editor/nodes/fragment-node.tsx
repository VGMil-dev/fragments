import {
  $applyNodeReplacement,
  DecoratorNode,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import * as React from "react";

export type SerializedFragmentNode = Spread<
  {
    content: string;
    type: "fragment";
    version: 1;
  },
  SerializedLexicalNode
>;

export class FragmentNode extends DecoratorNode<React.ReactNode> {
  __content: string;

  static getType(): string {
    return "fragment";
  }

  static clone(node: FragmentNode): FragmentNode {
    return new FragmentNode(node.__content, node.__key);
  }

  constructor(content: string, key?: NodeKey) {
    super(key);
    this.__content = content;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    div.className = "my-4 p-4 rounded-xl bg-white/5 border border-white/10 relative group";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedFragmentNode): FragmentNode {
    const node = $createFragmentNode(serializedNode.content);
    return node;
  }

  exportJSON(): SerializedFragmentNode {
    return {
      content: this.__content,
      type: "fragment",
      version: 1,
    };
  }

  getContent(): string {
    return this.__content;
  }

  decorate(): React.ReactNode {
    // Simple preview of the fragment content
    const isQuiz = this.__content.startsWith("::quiz");
    let title = "Custom Block";
    let details = "";

    if (isQuiz) {
      title = "Quiz Component";
      try {
        const jsonStr = this.__content.replace("::quiz", "").replace("::end", "").trim();
        const data = JSON.parse(jsonStr);
        details = data.question;
      } catch (e) {
        details = "Invalid Quiz Data";
      }
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white/40">{title}</span>
        </div>
        <p className="text-sm text-white/80 line-clamp-2">{details || this.__content}</p>
      </div>
    );
  }
}

export function $createFragmentNode(content: string): FragmentNode {
  return $applyNodeReplacement(new FragmentNode(content));
}

export function $isFragmentNode(node: LexicalNode | null | undefined): node is FragmentNode {
  return node instanceof FragmentNode;
}
