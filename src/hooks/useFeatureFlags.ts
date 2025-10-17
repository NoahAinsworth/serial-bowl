import { useState } from 'react';

export const useFeatureFlags = () => {
  const [flags] = useState({
    BINGE_POINTS: true,
  });
  
  return flags;
};
