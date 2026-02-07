import { getBezierPath, type EdgeProps } from 'reactflow';
import { useId } from 'react';
import { motion } from 'motion/react';

/**
 * Custom ReactFlow edge using MagicUI's AnimatedBeam technique.
 *
 * Draws a smooth bezier curve with:
 * 1. A subtle static base path (the "wire")
 * 2. A gradient-stroked path with motion.linearGradient that
 *    animates its coordinates, creating a smooth traveling light beam.
 *
 * This is the same technique MagicUI uses — the gradient itself moves
 * across the path using framer-motion's animate prop on the
 * SVG linearGradient element.
 */
export default function AnimatedBeamEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
}: EdgeProps) {
  const id = useId();

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const color = (style?.stroke as string) || '#6366f1';
  const width = (style?.strokeWidth as number) || 1.5;

  return (
    <>
      {/* Base wire — always visible, subtle track */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />

      {/* Animated beam — gradient light traveling along the path */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={width}
        stroke={`url(#${id})`}
        strokeOpacity="1"
        strokeLinecap="round"
      />

      <defs>
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: '0%',
            x2: '0%',
            y1: '0%',
            y2: '0%',
          }}
          animate={{
            x1: ['10%', '110%'],
            x2: ['0%', '100%'],
            y1: ['0%', '0%'],
            y2: ['0%', '0%'],
          }}
          transition={{
            duration: Math.random() * 3 + 4,
            ease: [0.16, 1, 0.3, 1],
            repeat: Infinity,
            repeatDelay: 0,
          }}
        >
          <stop stopColor={color} stopOpacity="0" />
          <stop stopColor={color} />
          <stop offset="32.5%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </>
  );
}
