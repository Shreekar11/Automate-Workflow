import { Workflow } from "@/types";
import { FileSpreadsheet, Mail, Webhook } from "lucide-react";
import { Edge, Node } from "reactflow";

export const createInitialNodes = (workflow?: Workflow | null): Node[] => {
  if (!workflow) {
    return [
      {
        id: "trigger",
        type: "trigger",
        position: { x: 600, y: 100 },
        data: { label: "Trigger" },
      },
      {
        id: "action1",
        type: "action",
        position: { x: 600, y: 350 },
        data: { label: "Action 1" },
      },
    ];
  }

  const nodes: Node[] = [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 600, y: 100 },
      data: {
        label: "Trigger",
        selectedOption: {
          icon: <Webhook />,
          metadata: workflow.workflow.trigger.metadata,
          name: workflow.workflow.trigger.type.name,
        },
      },
    },
  ];

  workflow.workflow.actions.forEach((action, index) => {
    nodes.push({
      id: `action${index + 1}`,
      type: "action",
      position: { x: 600, y: 350 + index * 250 },
      data: {
        label: `Action ${index + 1}`,
        selectedOption: {
          icon: action.type.name === "Email" ? <Mail /> : <FileSpreadsheet />,
          metadata: action.metadata || {},
          name: action.type.name || "",
          triggerMetadata: workflow.workflow.trigger.metadata,
        },
      },
    });
  });

  return nodes;
};

export const createInitialEdges = (workflow?: Workflow | null): Edge[] => {
  if (!workflow) {
    return [
      {
        id: "e-trigger-action1",
        source: "trigger",
        target: "action1",
        animated: true,
      },
    ];
  }

  const edges: Edge[] = [];
  let previousNodeId = "trigger";

  workflow.workflow.actions.forEach((_, index) => {
    const currentNodeId = `action${index + 1}`;
    edges.push({
      id: `e-${previousNodeId}-${currentNodeId}`,
      source: previousNodeId,
      target: currentNodeId,
      animated: true,
    });
    previousNodeId = currentNodeId;
  });

  return edges;
};
