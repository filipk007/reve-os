"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { DataFlowEdge } from "@/lib/types";

interface DataFlowConnectionsProps {
  edges: DataFlowEdge[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface PortPosition {
  x: number;
  y: number;
}

export function DataFlowConnections({
  edges,
  containerRef,
}: DataFlowConnectionsProps) {
  const [positions, setPositions] = useState<
    Map<string, { left: PortPosition; right: PortPosition }>
  >(new Map());
  const svgRef = useRef<SVGSVGElement>(null);

  const computePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newPositions = new Map<
      string,
      { left: PortPosition; right: PortPosition }
    >();

    // Find all nodes by data-node-id
    const nodes = container.querySelectorAll("[data-node-id]");
    nodes.forEach((node) => {
      const id = node.getAttribute("data-node-id");
      if (!id) return;

      const rect = node.getBoundingClientRect();
      newPositions.set(id, {
        left: {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top + rect.height / 2,
        },
        right: {
          x: rect.right - containerRect.left,
          y: rect.top - containerRect.top + rect.height / 2,
        },
      });
    });

    setPositions(newPositions);
  }, [containerRef]);

  useEffect(() => {
    computePositions();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(computePositions);
    });
    observer.observe(container);

    // Also recompute on scroll
    const onScroll = () => requestAnimationFrame(computePositions);
    container.addEventListener("scroll", onScroll);

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", onScroll);
    };
  }, [computePositions, containerRef, edges]);

  if (edges.length === 0 || positions.size === 0) return null;

  const containerEl = containerRef.current;
  if (!containerEl) return null;

  const width = containerEl.scrollWidth;
  const height = containerEl.scrollHeight;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-0 hidden md:block"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="arrow-resolved"
          viewBox="0 0 10 7"
          refX="9"
          refY="3.5"
          markerWidth="6"
          markerHeight="5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="rgb(var(--kiln-teal))"
            opacity="0.4"
          />
        </marker>
        <marker
          id="arrow-unresolved"
          viewBox="0 0 10 7"
          refX="9"
          refY="3.5"
          markerWidth="6"
          markerHeight="5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="rgb(var(--kiln-mustard, 245, 158, 11))"
            opacity="0.4"
          />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = positions.get(edge.fromNodeId);
        const to = positions.get(edge.toNodeId);
        if (!from || !to) return null;

        const startX = from.right.x;
        const startY = from.right.y;
        const endX = to.left.x;
        const endY = to.left.y;

        // Elbow-routed path
        const midX = (startX + endX) / 2;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

        return (
          <path
            key={edge.id}
            d={path}
            fill="none"
            stroke={edge.resolved ? "rgba(45, 212, 191, 0.3)" : "rgba(245, 158, 11, 0.3)"}
            strokeWidth={1.5}
            strokeDasharray={edge.resolved ? "none" : "4 3"}
            markerEnd={
              edge.resolved
                ? "url(#arrow-resolved)"
                : "url(#arrow-unresolved)"
            }
          />
        );
      })}
    </svg>
  );
}
