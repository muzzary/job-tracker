/** @type {import('tailwindcss').Config} */
// Tailwind is configured around the project's "Spaceship" palette + logo colours.
// Keeping the palette here (not scattered through components) means every screen
// stays on-brand and we change a colour in exactly one place.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Near-black used for primary text (palette: "Neverything").
        ink: "#13181B",
        // Cream app background (palette: "Magical Moonlight").
        moonlight: "#F0EEEB",
        // Cool light grey for borders / muted surfaces (palette: "Polar Drift").
        polar: "#CCD5DA",
        // Deep blue brand primary (palette: "Ateneo Blue"), with a few shades
        // so buttons have hover/active states without inventing new colours.
        ateneo: {
          DEFAULT: "#003A6C",
          600: "#013560",
          700: "#012A4D",
          50: "#E6EEF4",
        },
        // Warm accents (palette: "Sea Buckthorn" amber, "Miami Coral").
        buckthorn: "#FFBF65",
        coral: "#FD8973",
        // Teal pulled from the logo, used for the positive "Offer" status.
        teal: "#0E9AA7",
      },
      fontFamily: {
        // Outfit is a clean, distinctive grotesk (not the over-used Inter).
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        // Monospace strictly for numbers/metrics so columns line up neatly.
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Soft, wide "diffusion" shadow that tints toward the brand ink colour,
        // giving depth without a harsh black drop shadow.
        card: "0 10px 30px -12px rgba(19, 24, 27, 0.12)",
        lift: "0 18px 40px -14px rgba(1, 42, 77, 0.22)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Soft breathing glow for "live"/accent dots and rings.
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.12)" },
        },
        // Note: the aurora/float/shine/shimmer keyframes are defined directly in
        // index.css because they drive raw-CSS classes (.aurora, .shine-streak,
        // .skeleton), not Tailwind `animate-*` utilities.
      },
      animation: {
        // Used for staggered card reveals and modal entrance.
        "fade-up": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
