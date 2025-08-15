"use client";

import React from "react";
import { CircularProgress, Box, Typography } from "@mui/material";

interface LoaderProps {
  size?: number;
  text?: string;
  fullScreen?: boolean;
  withBackdrop?: boolean;
}

export default function Loader({
  size = 40,
  text,
  fullScreen = false,
  withBackdrop = false,
}: LoaderProps) {
  const loaderContent = (
    <Box className="flex flex-col items-center justify-center">
      <CircularProgress size={size} />
      {text && (
        <Typography
          variant="body2"
          className="mt-2 text-gray-600 dark:text-gray-300"
        >
          {text}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        className={`fixed inset-0 flex items-center justify-center z-50 ${
          withBackdrop ? "bg-black/30 backdrop-blur-sm" : ""
        }`}
      >
        {loaderContent}
      </Box>
    );
  }

  return (
    <Box className="py-6 flex items-center justify-center w-full">
      {loaderContent}
    </Box>
  );
}
