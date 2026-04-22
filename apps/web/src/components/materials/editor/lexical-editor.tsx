"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { MarkdownPlugin } from "./plugins/markdown-plugin";
import { useState, useCallback } from "react";
import { ComponentPickerPlugin } from "./plugins/component-picker";
import { QuizModal, QuizData } from "./quiz-modal";
import { FragmentNode, $createFragmentNode } from "./nodes/fragment-node";
import { FRAGMENT_TRANSFORMER, FRAGMENT_TEXT_TRANSFORMER } from "./transformers/fragment-transformers";
import { $getSelection, $insertNodes } from "lexical";

const ALL_TRANSFORMERS = [...TRANSFORMERS, FRAGMENT_TRANSFORMER, FRAGMENT_TEXT_TRANSFORMER];

const theme = {
  paragraph: "mb-2 text-white/90",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
  list: {
    nested: {
      listitem: "list-none",
    },
    ol: "list-decimal ml-4",
    ul: "list-disc ml-4",
    listitem: "ml-2",
  },
};

function onError(error: Error) {
  console.error(error);
}

export function LexicalEditor({ 
  onChange, 
  initialValue 
}: { 
  onChange?: (markdown: string) => void,
  initialValue?: string 
}) {
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const initialConfig = {
    namespace: "MaterialsEditor",
    theme,
    onError,
    nodes: [FragmentNode],
  };

  const handleQuizSubmit = useCallback((data: QuizData) => {
    if (editorInstance) {
      editorInstance.update(() => {
        const content = `::quiz\n${JSON.stringify(data, null, 2)}\n::end`;
        const node = $createFragmentNode(content);
        $insertNodes([node]);
      });
    }
  }, [editorInstance]);

  return (
    <div className="relative border rounded-xl overflow-hidden bg-black/40 backdrop-blur-md border-white/10 group focus-within:border-white/20 transition-colors">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative p-6">
          <RichTextPlugin
            contentEditable={<ContentEditable className="outline-none min-h-[300px] text-lg leading-relaxed" />}
            placeholder={<div className="absolute top-6 left-6 text-white/30 pointer-events-none text-lg">Start typing or use '::' for components...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <TablePlugin />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
          <ComponentPickerPlugin onOpenQuizModal={() => setIsQuizModalOpen(true)} />
          <LexicalInstancePlugin onInstance={setEditorInstance} />
          {onChange && <MarkdownPlugin onChange={onChange} />}
        </div>
        <QuizModal 
          isOpen={isQuizModalOpen} 
          onClose={() => setIsQuizModalOpen(false)} 
          onSubmit={handleQuizSubmit} 
        />
      </LexicalComposer>
    </div>
  );
}

function LexicalInstancePlugin({ onInstance }: { onInstance: (editor: any) => void }) {
  const [editor] = useLexicalComposerContext();
  useState(() => {
    onInstance(editor);
  });
  return null;
}

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
