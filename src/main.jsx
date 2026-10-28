import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/space-grotesk";
import "./style.css";
import { App } from "./app.jsx";
createRoot(document.getElementById("root")).render(<App />);
