import { Navigate, Route, Routes } from "react-router-dom";

import { MainPage } from "@/pages/MainPage";

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
