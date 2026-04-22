"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useEffect } from "react";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

export function MarkdownPlugin({
  onChange,
}: {
  onChange: (markdown: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(TRANSFORMERS);
          onChange(markdown);
        });
      }}
    />
  );
}
