import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Navigate from "./pages/Navigate";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/navigate" element={<Navigate />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}