import { useWindowDimensions } from 'react-native';

const WIDE_LAYOUT_MIN_WIDTH = 900;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;

  return {
    width,
    height,
    isLandscape,
    isWide,
    isTabletLandscape: isWide && isLandscape,
  };
}
