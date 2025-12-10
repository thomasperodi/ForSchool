"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SSButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function SSButton({ children, onClick, className = "" }: SSButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-br from-red-600 to-red-800 ${className}`}
    >
      {children}
    </motion.button>
  );
}
