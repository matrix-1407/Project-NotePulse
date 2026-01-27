import { motion } from 'framer-motion';
import '../styles/AnimatedLogo.css';

export default function AnimatedLogo({ size = 32 }) {
  const barVariants = {
    initial: { scaleY: 0.3 },
    animate: (i) => ({
      scaleY: [0.3, 1, 0.5, 1, 0.3],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        delay: i * 0.15,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <div className="animated-logo" style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="animated-logo-bar"
          custom={i}
          variants={barVariants}
          initial="initial"
          animate="animate"
        />
      ))}
    </div>
  );
}
