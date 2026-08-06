import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './store/cartStore';
import { ProductsProvider } from './store/productsStore';
import { OrdersProvider } from './store/ordersStore';
import { AuthProvider } from './store/authStore';
import { useAuth } from './store/authStore';
import { ViewModeProvider } from './store/viewModeStore';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import ClientLayout from './components/layout/ClientLayout';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import AdminOrders from './pages/admin/Orders';
import Companies from './pages/admin/Companies';

// Client Pages
import ClientLogin from './pages/client/Login';
import Register from './pages/client/Register';
import ClientDashboard from './pages/client/ClientDashboard';
import Catalog from './pages/client/Catalog';
import Cart from './pages/client/Cart';
import OrderConfirmation from './pages/client/OrderConfirmation';
import Profile from './pages/client/Profile';

function RequireCompany({ children }: { children: JSX.Element }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function RequireSuperAdmin({ children }: { children: JSX.Element }) {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? children : <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <ViewModeProvider>
    <AuthProvider>
    <ProductsProvider>
      <OrdersProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Client Auth */}
            <Route path="/login" element={<ClientLogin />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            {/* Client Portal */}
            <Route element={<RequireCompany><ClientLayout /></RequireCompany>}>
              <Route path="/" element={<ClientDashboard />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin Auth */}
            <Route path="/admin" element={<Navigate to="/login?mode=admin" replace />} />

            {/* Admin Panel */}
            <Route element={<RequireSuperAdmin><AdminLayout /></RequireSuperAdmin>}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/companies" element={<Companies />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
      </OrdersProvider>
    </ProductsProvider>
    </AuthProvider>
    </ViewModeProvider>
  );
}
