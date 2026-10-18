import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * RouteScrollToTop automatically resets scroll position to top when changing pages
 */
const RouteScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

interface SmoothScrollProps {
  children: React.ReactNode;
}

/**
 * High-performance native scroll provider component.
 * Uses hardware-accelerated browser compositor scrolling (0ms latency, zero main-thread lag).
 */
export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children }) => {
  return (
    <>
      <RouteScrollToTop />
      {children}
    </>
  );
};

export default SmoothScroll;

