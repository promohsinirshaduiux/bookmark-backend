"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: (config: Record<string, unknown>) => unknown;
  }
}

export default function DocsPage() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      if (!window.SwaggerUIBundle) return;
      window.SwaggerUIBundle({
        url: "/api/docs",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [(window.SwaggerUIBundle as any).presets.apis],
        layout: "BaseLayout",
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(css);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa" }}>
      <div id="swagger-ui" />
    </main>
  );
}
