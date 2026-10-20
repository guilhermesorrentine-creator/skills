import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/home.css";
import "./styles/catalog.css";
import "./styles/detail.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
