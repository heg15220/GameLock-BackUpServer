import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const bootstrap = () => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (import.meta.env.VITE_BENCH) {
  import("./bench/instrumentation.js").then((mod) => {
    mod.installBenchInstrumentation();
    bootstrap();
  });
} else {
  bootstrap();
}
