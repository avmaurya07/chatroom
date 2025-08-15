import { keyframes } from "@emotion/react";

// Define shimmer animation keyframes
export const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Add smooth transitions to elements
export const addSmoothTransitions = {
  transition: "all 0.3s ease-in-out",
};

// Add a shimmer loading effect to an element
export const addShimmerEffect = {
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)",
  backgroundSize: "200% 100%",
  animation: `${shimmer} 1.5s infinite linear`,
};

// Add a fade-in effect
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Add a pulse animation
export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

// Add a slide-in-up animation
export const slideInUp = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Create a staggered animation delay for lists
export const getStaggeredDelay = (index: number, baseDelay = 0.1) => ({
  animationDelay: `${index * baseDelay}s`,
});
