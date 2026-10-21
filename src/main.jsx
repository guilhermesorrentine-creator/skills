import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import Root from "./Root.jsx";
import { MotionPreferenceProvider, MotionToggle } from "./lib/motion-pref.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/characters.css";
import "./styles/landing.css";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionPreferenceProvider>
      <Root />
      <MotionToggle />
    </MotionPreferenceProvider>
  </React.StrictMode>,
);
