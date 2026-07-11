"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import katex from "katex";
import { useState, useRef, useEffect } from "react";

function EquationInlineView({
  formula,
  onFormulaChange,
}: {
  formula: string;
  onFormulaChange: (formula: string) => void;
}) {
  const [editing, setEditing] = useState(!formula);
  const [value, setValue] = useState(formula);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing]);

  useEffect(() => {
    setValue(formula);
  }, [formula]);

  if (editing) {
    return (
      <span
        contentEditable={false}
        onMouseDown={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 rounded border border-border px-1.5 mx-0.5 align-middle"
        style={{ background: "var(--muted, rgba(0,0,0,0.04))" }}
      >
        <span className="text-muted-foreground text-xs select-none">∑</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && value.trim()) {
              e.preventDefault();
              onFormulaChange(value.trim());
              setEditing(false);
            }
            if (e.key === "Escape" && formula) {
              e.preventDefault();
              setValue(formula);
              setEditing(false);
            }
          }}
          onBlur={() => {
            if (value.trim()) {
              onFormulaChange(value.trim());
              setEditing(false);
            } else if (formula) {
              setValue(formula);
              setEditing(false);
            }
          }}
          placeholder="LaTeX..."
          className="bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          style={{ width: `${Math.max(value.length, 8)}ch`, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
      </span>
    );
  }

  let html: string;
  try {
    // We use inline mode for KaTeX so it flows with text
    html = katex.renderToString(formula, {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    html = formula;
  }

  return (
    <span
      contentEditable={false}
      onClick={() => setEditing(true)}
      className="inline-flex items-center px-1 mx-0.5 rounded cursor-pointer transition-colors"
      style={{ 
        color: "var(--equation-color, #6c5ce7)",
        backgroundColor: "var(--equation-bg, rgba(108, 92, 231, 0.1))"
      }}
      title="Click to edit equation"
      onMouseOver={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--equation-bg-hover, rgba(108, 92, 231, 0.2))")
      }
      onMouseOut={(e) => 
        (e.currentTarget.style.backgroundColor = "var(--equation-bg, rgba(108, 92, 231, 0.1))")
      }
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .dark {
          --equation-color: #a29bfe;
          --equation-bg: rgba(162, 155, 254, 0.12);
          --equation-bg-hover: rgba(162, 155, 254, 0.2);
        }
      `}</style>
    </span>
  );
}

export const equationInlineSpec = createReactInlineContentSpec(
  {
    type: "inlineEquation",
    propSchema: {
      formula: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <EquationInlineView
        formula={props.inlineContent.props.formula}
        onFormulaChange={(formula) => {
          // BlockNote's updateInlineContent replaces the node with a new one
          props.updateInlineContent({
            type: "inlineEquation",
            props: { formula }
          });
        }}
      />
    ),
  }
);
