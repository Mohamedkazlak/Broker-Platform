import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Subtle spring + fade for main marketing site route changes (Platform, About, Contact, etc.). */
export function MarketingAnimatedLayout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className="min-h-[100dvh]">
        <Outlet />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="min-h-[100dvh]"
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1],
          },
        }}
        exit={{
          opacity: 0,
          y: -10,
          filter: "blur(4px)",
          transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
        }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
