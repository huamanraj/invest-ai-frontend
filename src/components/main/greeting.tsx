"use client";

import { useMemo } from "react";

export function Greeting() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return "Good morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  }, []);

  return (
    <div className="text-center mb-8">
      <h2 className="text-4xl font-semibold text-foreground mb-3">
        {greeting}! 👋
      </h2>
      <p className="text-muted-foreground text-base">
        Ready to analyze a company's financial report?
      </p>
    </div>
  );
}

