"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { useCallback, useMemo, useState } from "react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { HelpCircle, Layout, Code } from "lucide-react";

class ComponentPickerOption extends MenuOption {
  title: string;
  icon?: React.ReactNode;
  keywords: Array<string>;
  keyboardShortcut?: string;
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: {
      icon?: React.ReactNode;
      keywords?: Array<string>;
      keyboardShortcut?: string;
      onSelect: (queryString: string) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.keyboardShortcut = options.keyboardShortcut;
    this.onSelect = options.onSelect;
  }
}

function ComponentPickerMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: ComponentPickerOption;
}) {
  let className = "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors";
  if (isSelected) {
    className += " bg-white/10 text-white";
  } else {
    className += " text-white/70 hover:bg-white/5";
  }

  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={"typeahead-item-" + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <div className="w-8 h-8 flex items-center justify-center rounded bg-white/5 border border-white/10">
        {option.icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{option.title}</span>
        {option.keyboardShortcut && (
          <span className="text-[10px] uppercase opacity-50">{option.keyboardShortcut}</span>
        )}
      </div>
    </li>
  );
}

export function ComponentPickerPlugin({
  onOpenQuizModal,
}: {
  onOpenQuizModal: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("::", {
    minLength: 0,
  });

  const options = useMemo(() => {
    const baseOptions = [
      new ComponentPickerOption("Quiz", {
        icon: <HelpCircle className="w-4 h-4" />,
        keywords: ["quiz", "question", "multiple choice"],
        onSelect: () => {
          onOpenQuizModal();
        },
      }),
      new ComponentPickerOption("Code Block", {
        icon: <Code className="w-4 h-4" />,
        keywords: ["code", "programming"],
        onSelect: () => {
          // TODO: Implement code block insertion
        },
      }),
    ];

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, "i");
    return baseOptions.filter(
      (option) =>
        regex.test(option.title) ||
        option.keywords.some((keyword) => regex.test(keyword)),
    );
  }, [queryString, onOpenQuizModal]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: any, // TextNode | null
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        if (nodeToRemove) {
          nodeToRemove.remove();
        }
        selectedOption.onSelect(matchingString);
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchorElementRef.current && options.length
          ? ReactDOM.createPortal(
              <div className="z-50 min-w-[240px] bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl">
                <ul className="py-1">
                  {options.map((option, i) => (
                    <ComponentPickerMenuItem
                      index={i}
                      isSelected={selectedIndex === i}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i);
                      }}
                      option={option}
                      key={option.key}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
          : null
      }
    />
  );
}
