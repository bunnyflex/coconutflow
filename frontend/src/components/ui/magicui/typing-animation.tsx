"use client";

import { useEffect, useState } from "react";
import { cn } from "../../../lib/utils";

interface TypingAnimationProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export function TypingAnimation({
  text,
  className,
  speed = 15,
  onComplete,
}: TypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={cn(className)}>
      {displayed}
      {!done && <span className="animate-blink-cursor ml-0.5 inline-block h-4 w-[2px] bg-gray-400 align-middle" />}
    </span>
  );
}
