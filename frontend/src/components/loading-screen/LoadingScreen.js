import { CircularProgress } from '@mui/material';
import "./LoadingScreen.scss";

const LoadingScreen = () => (
    <div className="spinner-overlay no-select">
        <CircularProgress color='success' className='spinner' />
    </div>
);

export default LoadingScreen;