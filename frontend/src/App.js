import './App.scss';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { green } from '@mui/material/colors';
import Login from './components/login/Login';

import { HashRouter, Routes, Route } from 'react-router-dom';
import MainApp from './components/main-app/MainApp';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import UnsubscribeSummary from './components/unsubscribe-summary/UnsubscribeSummary';

const darkTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
    background: {
      default: '#191919',
      paper: '#191919',
    },
    primary: {
      main: green[500],
    },
  },
});


const Router = () => (
  <Routes>
    <Route
      path="/login"
      element={<ProtectedRoute guest component={Login} />}
    />

    <Route
      path="/app"
      element={
        <ProtectedRoute authenticated component={MainApp} />
      }
    />

    <Route
      path="/unsubscribe/summary"
      element={
        <ProtectedRoute authenticated component={UnsubscribeSummary} />
      }
    />



    <Route path="*"
      element={
        <ProtectedRoute authenticated component={MainApp} />
      }
    />
  </Routes>
)


function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <AuthProvider>
        <HashRouter>
          <Router />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
