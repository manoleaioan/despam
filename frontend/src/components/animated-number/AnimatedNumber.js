import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

function AnimatedNumber({ value, className }) {
  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  const display = useTransform(spring, (current) =>
    Math.round(current).toString()
  );

  useEffect(() => {
    spring.set(value);
  }, [value]);

  return <motion.span className={className}>{display}</motion.span>;
}

export default AnimatedNumber;
