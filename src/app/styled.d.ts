// src/styled.d.ts
import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      background: string;
      surface:    string;
      border:     string;
      text:       string;
      muted:      string;
      primary:    string;
      secondary:  string;
    };
    radii: {
      small:  string;
      medium: string;
      large:  string;
    };
    shadows: {
      light: string;
      heavy: string;
    };
  }
}
