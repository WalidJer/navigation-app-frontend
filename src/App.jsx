import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Navigate from "./pages/Navigate";
import Debug from "./pages/Debug";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/navigate" element={<Navigate />} />
          <Route path="/debug" element={<Debug />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}