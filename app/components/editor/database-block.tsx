"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { DatabaseScreen } from "@/components/database/database-screen";

// Read-only-to-the-editor view rendered inside the custom "database" block.
// It hosts a full embedded DatabaseScreen for the referenced database id.
function DatabaseBlockView({ databaseId }: { databaseId: string }) {
  if (!databaseId) {
    return (
      <div className="my-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Creating database…
      </div>
    );
  }
  return (
    // contentEditable=false keeps ProseMirror from treating the embedded UI as
    // editable text; stopping mousedown prevents the editor from stealing focus
    // from inputs/buttons inside the database view.
    <div
      contentEditable={false}
      onMouseDown={(e) => e.stopPropagation()}
      className="my-2"
    >
      <DatabaseScreen databaseId={databaseId} embedded />
    </div>
  );
}

// Custom block: stores only a reference (databaseId) in block props; the
// database itself is a normal Database row + child page. createReactBlockSpec
// returns a factory in this BlockNote version — call it to get the BlockSpec.
export const databaseBlockSpec = createReactBlockSpec(
  {
    type: "database",
    propSchema: {
      databaseId: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <DatabaseBlockView databaseId={props.block.props.databaseId} />
    ),
  }
)();
