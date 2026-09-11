import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import Logo from '../../assets/logo.png';
import "./Login.scss";
import { Button } from '@mui/material';

function Login() {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    await window.electronAPI.getOAuth2ClientWithToken(true);
    setIsAuthenticated(true);
    navigate('/app', { replace: true });
  };

  return (
    <div className='login-container no-select'>
      <div className='card'>
        <svg width="100%" height="186" viewBox="0 0 530 186" fill="none" xmlns="http://www.w3.org/2000/svg" className='bgelem'>
          <g filter="url(#filter0_d_4_113)">
            <path d="M-130 -65H658C658 -65 305.788 167 262.508 167C219.227 167 -130 -65 -130 -65Z" fill="#21261E" />
          </g>
          <defs>
            <filter id="filter0_d_4_113" width="1000" height="255.6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dy="7" />
              <feGaussianBlur stdDeviation="5.9" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_4_113" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_4_113" result="shape" />
            </filter>
          </defs>
        </svg>

        <div className='top'>
          <img src={Logo} alt="Logo" className='logo' />
          <h1>Despam</h1>
          <span>Clean your spam. Keep it Zen.</span>
        </div>

        <hr/>

        <Button onClick={handleLogin} className='google-btn btn'>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_1_8)">
              <path d="M31.5392 16.4851C31.5392 15.1979 31.4348 14.2585 31.2087 13.2844H16.51V19.0943H25.1378C24.9639 20.5381 24.0246 22.7125 21.9372 24.1736L21.9079 24.3681L26.5554 27.9684L26.8774 28.0006C29.8345 25.2695 31.5392 21.2513 31.5392 16.4851Z" fill="#4285F4" />
              <path d="M16.51 31.7926C20.7369 31.7926 24.2855 30.4009 26.8774 28.0005L21.9372 24.1735C20.6152 25.0955 18.8409 25.7391 16.51 25.7391C12.37 25.7391 8.85627 23.0082 7.60372 19.2335L7.42012 19.249L2.58761 22.989L2.52441 23.1647C5.09884 28.2787 10.3869 31.7926 16.51 31.7926Z" fill="#34A853" />
              <path d="M7.6037 19.2334C7.2732 18.2593 7.08193 17.2155 7.08193 16.1371C7.08193 15.0586 7.2732 14.0149 7.58631 13.0408L7.57756 12.8333L2.68449 9.03333L2.5244 9.10947C1.46335 11.2317 0.854523 13.6148 0.854523 16.1371C0.854523 18.6594 1.46335 21.0424 2.5244 23.1646L7.6037 19.2334Z" fill="#FBBC05" />
              <path d="M16.51 6.5351C19.4497 6.5351 21.4327 7.80492 22.5634 8.86609L26.9817 4.55211C24.2682 2.02985 20.7369 0.481689 16.51 0.481689C10.3869 0.481689 5.09884 3.99545 2.52441 9.10952L7.58633 13.0408C8.85627 9.26614 12.37 6.5351 16.51 6.5351Z" fill="#EB4335" />
            </g>
            <defs>
              <clipPath id="clip0_1_8">
                <rect width="31.4189" height="31.4189" fill="white" transform="translate(0.494781 0.481689)" />
              </clipPath>
            </defs>
          </svg>
          Continue with Google</Button>
      </div>
    </div>
  );
}

export default Login;
