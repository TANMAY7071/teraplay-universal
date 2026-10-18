import React, { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { useLocation } from "react-router-dom";

/**
 * RouteScrollToTop automatically resets scroll position to top when changing pages
 */
const RouteScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, lenis]);

  return null;
};

interface SmoothScrollProps {
  children: React.ReactNode;
}

/**
 * High-performance Lenis Smooth Scroll provider component
 */
export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children }) => {
  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        infinite: false,
      }}
    >
      <RouteScrollToTop />
      {children}
    </ReactLenis>
  );
};

export default SmoothScroll;
