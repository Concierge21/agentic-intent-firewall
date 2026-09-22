interface RequestRecord {
  timestamps: number[];
}

const clientHistory: { [identifier: string]: RequestRecord } = {};

// Window: 60 seconds, Max allowed normal requests before velocity penalty kicks in
const WINDOW_MS = 60000;
const VELOCITY_THRESHOLD = 5; 

export function checkAgentVelocity(identifier: string = 'default_agent'): { isVelocitySpike: boolean; requestCount: number; penaltyScore: number } {
  const now = Date.now();
  
  if (!clientHistory[identifier]) {
    clientHistory[identifier] = { timestamps: [] };
  }

  // Filter timestamps within the rolling 60-second window
  clientHistory[identifier].timestamps = clientHistory[identifier].timestamps.filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  // Record current request
  clientHistory[identifier].timestamps.push(now);
  const requestCount = clientHistory[identifier].timestamps.length;

  // Check if velocity exceeds threshold
  let penaltyScore = 0;
  let isVelocitySpike = false;

  if (requestCount > VELOCITY_THRESHOLD) {
    isVelocitySpike = true;
    // Dynamic penalty escalates with request frequency
    penaltyScore = (requestCount - VELOCITY_THRESHOLD) * 15; 
  }

  return {
    isVelocitySpike,
    requestCount,
    penaltyScore: Math.min(penaltyScore, 50) // Cap max velocity penalty at 50 points
  };
}