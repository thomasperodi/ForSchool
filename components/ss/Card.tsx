"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SSCardProps {
  children: ReactNode;
  className?: string;
}

export default function SSCard({ children, className = "" }: SSCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl p-5 shadow-lg bg-white ${className}`}
    >
      {children}
    </motion.div>
  );
}
