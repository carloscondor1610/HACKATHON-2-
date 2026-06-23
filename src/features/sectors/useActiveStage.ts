import { useEffect, useState } from "react";

export function useActiveStage(count: number) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const sections = document.querySelectorAll("[data-story-stage]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const index = Number(
            (entry.target as HTMLElement).dataset.index
          );

          setActiveStage(index);
        });
      },
      {
        threshold: 0.5,
      }
    );

    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [count]);

  return activeStage;
}