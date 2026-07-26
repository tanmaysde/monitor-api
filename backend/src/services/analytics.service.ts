import { Types } from "mongoose";
import Log from "../models/Log";

export const calculateMonitorAnalytics = async (
  monitorId: string,
  workspaceId: string,
) => {
  const monitorObjectId = new Types.ObjectId(monitorId);
  const workspaceObjectId = new Types.ObjectId(workspaceId);

  const [summary] = await Log.aggregate([
    {
      $match: {
        monitorId: monitorObjectId,
        workspaceId: workspaceObjectId,
      },
    },
    {
      $group: {
        _id: null,
        totalChecks: {
          $sum: 1,
        },
        upChecks: {
          $sum: {
            $cond: [{ $eq: ["$status", "UP"] }, 1, 0],
          },
        },
        downChecks: {
          $sum: {
            $cond: [{ $eq: ["$status", "DOWN"] }, 1, 0],
          },
        },
        averageResponseTime: {
          $avg: "$responseTime",
        },
        fastestResponseTime: {
          $min: "$responseTime",
        },
        slowestResponseTime: {
          $max: "$responseTime",
        },
      },
    },
  ]);

  if (!summary) {
    return {
      totalChecks: 0,
      upChecks: 0,
      downChecks: 0,
      uptimePercentage: 0,
      averageResponseTime: 0,
      fastestResponseTime: 0,
      slowestResponseTime: 0,
      failureCount: 0,
    };
  }

  const uptimePercentage =
    summary.totalChecks === 0
      ? 0
      : (summary.upChecks / summary.totalChecks) * 100;

  return {
    totalChecks: summary.totalChecks,
    upChecks: summary.upChecks,
    downChecks: summary.downChecks,
    uptimePercentage: Number(uptimePercentage.toFixed(2)),
    averageResponseTime: Math.round(summary.averageResponseTime || 0),
    fastestResponseTime: summary.fastestResponseTime || 0,
    slowestResponseTime: summary.slowestResponseTime || 0,
    failureCount: summary.downChecks,
  };
};
