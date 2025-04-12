import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import DataTransfers from "./pages/DataTransfers";
import KubernetesDashboard from "./pages/KubernetesDashboard";
import KubernetesCreate from "./pages/KubernetesCreate";
import "./App.css";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/data-transfers" element={<DataTransfers />} />
        <Route path="/kubernetes/dashboard" element={<KubernetesDashboard />} />
        <Route path="/kubernetes/create" element={<KubernetesCreate />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);