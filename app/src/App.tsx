import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { HotelList } from "./pages/HotelList";
import { HotelDetail } from "./pages/HotelDetail";
import { HotelForm } from "./pages/HotelForm";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <HotelList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotels/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <HotelForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotels/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <HotelDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
