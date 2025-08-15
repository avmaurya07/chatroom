"use client";

import React from "react";
import { Paper, Skeleton, Box } from "@mui/material";

interface RoomSkeletonProps {
  count?: number;
}

export default function RoomSkeleton({ count = 6 }: RoomSkeletonProps) {
  return (
    <>
      {Array.from(new Array(count)).map((_, index) => (
        <Paper
          key={index}
          className="p-6 border border-gray-100 animate-shimmer"
          elevation={2}
        >
          <Skeleton variant="text" width="70%" height={32} className="mb-3" />
          <Box className="flex items-center justify-between">
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="text" width={120} height={20} />
          </Box>
        </Paper>
      ))}
    </>
  );
}
