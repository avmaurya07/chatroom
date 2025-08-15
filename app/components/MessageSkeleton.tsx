"use client";

import React from "react";
import { Paper, Skeleton, Box } from "@mui/material";

interface MessageSkeletonProps {
  count?: number;
}

export default function MessageSkeleton({ count = 5 }: MessageSkeletonProps) {
  return (
    <div className="space-y-4 animate-stagger-fade-in">
      {Array.from(new Array(count)).map((_, index) => (
        <Box
          key={index}
          className={`flex ${
            index % 2 === 0 ? "justify-start" : "justify-end"
          }`}
        >
          <Paper
            className={`p-3 max-w-[85%] animate-shimmer ${
              index % 2 === 0
                ? "rounded-tr-2xl rounded-br-2xl rounded-bl-2xl"
                : "rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
            }`}
            elevation={1}
          >
            <Box className="flex items-center gap-2 mb-1">
              {index % 2 === 0 && (
                <Skeleton variant="circular" width={24} height={24} />
              )}
              <Skeleton variant="text" width={80} height={20} />
              {index % 2 !== 0 && (
                <Skeleton variant="circular" width={24} height={24} />
              )}
            </Box>
            <Skeleton
              variant="text"
              width={Math.random() * 150 + 100}
              height={20}
            />
            <Box className="mt-1 flex justify-end">
              <Skeleton variant="text" width={60} height={16} />
            </Box>
          </Paper>
        </Box>
      ))}
    </div>
  );
}
