import { DefaultTheme } from "styled-components";

export const theme: DefaultTheme = {
  colors: {
    background: "#0f172a",
    surface:    "#1e293b",
    border:     "#334155",
    text:       "#f1f5f9",
    muted:      "#94a3b8",
    primary:    "#3b82f6",
    secondary:  "#fbbf24",
  },
  radii: {
    small:  "4px",
    medium: "8px",
    large:  "16px",
  },
  shadows: {
    light:  "0 2px 6px rgba(0,0,0,0.12)",
    heavy:  "0 4px 12px rgba(0,0,0,0.24)",
  }
};
