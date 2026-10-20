import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import Root from "./Root.jsx";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/characters.css";
import "./styles/home.css";
import "./styles/catalog.css";
import "./styles/explorer.css";
import "./styles/detail.css";
import "./styles/commerce.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
