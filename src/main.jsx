import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ConsentProvider } from "./components/ConsentContext";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import "./styles.css";

registerServiceWorker();

const bootstrap = () => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <ConsentProvider>
          <App />
        </ConsentProvider>
      </BrowserRouter>
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
