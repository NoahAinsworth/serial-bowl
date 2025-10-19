import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const hapticLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Haptics not available (web or unsupported device)
  }
};

export const hapticMedium = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    // Haptics not available
  }
};

export const hapticHeavy = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    // Haptics not available
  }
};

export const hapticSelection = async () => {
  try {
    await Haptics.selectionStart();
  } catch (error) {
    // Haptics not available
  }
};
