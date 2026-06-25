import React from "react";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-brand-primary focus:text-white focus:font-medium focus:rounded-lg focus:shadow-lg focus:shadow-brand-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent focus:ring-offset-bg-paper transition-all duration-200"
    >
      Saltar al contenido principal
    </a>
  );
}
