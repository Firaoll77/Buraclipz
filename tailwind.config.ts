import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
    extend: {
      colors: {
        background: "#faf5ea",
        foreground: "#000000",
        primary: {
          DEFAULT: "#ff8442",
          hover: "#e66c29",
          light: "#ffb189",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#6040ff",
          hover: "#492be0",
          dark: "#3d27b8",
          foreground: "#ffffff",
        },
        dark: {
          DEFAULT: "#0a0a0a",
          surface: "#141414",
          card: "#181818",
        },
        border: "#141414",
        muted: "#666666",
      },
      borderRadius: {
        pill: "999px",
        card: "28px",
        "card-lg": "32px",
        "card-xl": "50px",
        btn: "11px",
        subtle: "5px",
      },
      spacing: {
        10: "10px",
        15: "15px",
        20: "20px",
        28: "28px",
        30: "30px",
        40: "40px",
        50: "50px",
        60: "60px",
        80: "80px",
        100: "100px",
        120: "120px",
      },
      fontFamily: {
        heading: ["Staatliches", "Impact", "Bebas Neue", "sans-serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0px 6px 20px 0px rgba(0, 0, 0, 0.12)",
        "card-dark": "0px 6px 20px 0px rgba(0, 0, 0, 0.4)",
        deep: "0px 18px 50px 0px rgba(0, 0, 0, 0.25)",
        inset: "rgb(0, 0, 0) 0px 0px 0px 1px inset",
      },
    },
  },
  plugins: [],
};

export default config;
