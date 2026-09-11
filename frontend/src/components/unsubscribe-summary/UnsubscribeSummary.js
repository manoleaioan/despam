import "./UnsubscribeSummary.scss";
import Logo from '../../assets/logo.png';
import { Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import AnimatedNumber from "../animated-number/AnimatedNumber";
import { motion } from "framer-motion";

const UnsubscribeSummary = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { unsubscribedCount = 0 } = location.state || {};

    return (
        <motion.div className="summary"
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
        >
            <img src={Logo} alt="Logo" className='logo' />
            <p>
                You’ve unsubscribed<br />
                from <AnimatedNumber value={unsubscribedCount} className="accent" /> emails!
            </p>
            <Button className="btn" onClick={() => navigate("/app")}>Close</Button>
        </motion.div>
    );
};

export default UnsubscribeSummary;
