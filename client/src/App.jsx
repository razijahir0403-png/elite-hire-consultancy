import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
