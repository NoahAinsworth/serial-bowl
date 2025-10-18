import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        yellow: "hsl(var(--yellow))",
        coral: "hsl(var(--coral))",
        lavender: "hsl(var(--lavender))",
        mint: "hsl(var(--mint))",
        "baby-blue": "hsl(var(--baby-blue))",
        "hot-pink": "hsl(var(--hot-pink))",
        "cartoon-orange": "hsl(var(--cartoon-orange))",
        "cartoon-yellow": "hsl(var(--cartoon-yellow))",
        "cartoon-blue": "hsl(var(--cartoon-blue))",
        "cartoon-pink": "hsl(var(--cartoon-pink))",
        "cartoon-mint": "hsl(var(--cartoon-mint))",
        "neon-green": "hsl(var(--neon-green))",
        "electric-lime": "hsl(var(--electric-lime))",
        "button-highlight": "hsl(var(--button-highlight))",
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],
        accent: ['Orbitron', 'Space Grotesk', 'sans-serif'],
        button: ['Orbitron', 'sans-serif'],
        ui: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        editorial: ['DM Sans', 'sans-serif'],
        futuristic: ['Orbitron', 'Space Grotesk', 'sans-serif'],
        logo: ['Lilita One', 'Fredoka One', 'cursive'],
        pixel: ['"Press Start 2P"', 'monospace'],
        playfair: ['Playfair Display', 'serif'],
        vhs: ['Audiowide', 'sans-serif'],
        'vhs-pixel': ['"Press Start 2P"', 'monospace'],
        'vhs-mono': ['VT323', 'monospace'],
        'vhs-ui': ['Rajdhani', 'sans-serif'],
        'cinematic': ['Poppins', 'Inter', 'sans-serif'],
        'cinematic-title': ['Audiowide', 'Poppins', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      borderWidth: {
        '3': '3px',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "gentle-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "cereal-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-3deg)" },
          "75%": { transform: "rotate(3deg)" },
        },
        "logo-shimmer": {
          "0%, 100%": { textShadow: "0 0 10px rgba(0, 255, 133, 0.5)" },
          "50%": { textShadow: "0 0 20px rgba(0, 255, 133, 0.8), 0 0 30px rgba(0, 255, 133, 0.3)" },
        },
        "neon-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 255, 133, 0.3)" },
          "50%": { boxShadow: "0 0 15px rgba(0, 255, 133, 0.6), 0 0 25px rgba(0, 255, 133, 0.3)" },
        },
        "holographic-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "vhs-scanline": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "vhs-grain": {
          "0%, 100%": { opacity: "0.03" },
          "50%": { opacity: "0.06" },
        },
        "vhs-flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.97" },
        },
        "vhs-rgb-drift": {
          "0%, 100%": { 
            textShadow: "2px 0 0 rgba(255,0,255,0.5), -2px 0 0 rgba(0,255,255,0.5)",
          },
          "50%": { 
            textShadow: "3px 0 0 rgba(255,0,255,0.7), -3px 0 0 rgba(0,255,255,0.7)",
          },
        },
        "vhs-jitter": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "25%": { transform: "translate(-1px, 1px) rotate(-0.3deg)" },
          "50%": { transform: "translate(1px, -1px) rotate(0.3deg)" },
          "75%": { transform: "translate(-1px, -1px) rotate(-0.2deg)" },
        },
        "ambient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "vhs-pulse": {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "lens-flare": {
          "0%": { transform: "scale(0) translateX(-50%) translateY(-50%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "scale(2) translateX(-50%) translateY(-50%)", opacity: "0" },
        },
        "soft-fade-in": {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "exposure-adjust": {
          "0%": { filter: "brightness(0.9)" },
          "100%": { filter: "brightness(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "gentle-bounce": "gentle-bounce 2s ease-in-out infinite",
        "cereal-pop": "cereal-pop 0.3s ease-in-out",
        "wiggle": "wiggle 0.5s ease-in-out",
        "logo-shimmer": "logo-shimmer 3s ease-in-out infinite",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "holographic-rotate": "holographic-rotate 4s linear infinite",
        "vhs-scanline": "vhs-scanline 8s linear infinite",
        "vhs-grain": "vhs-grain 0.5s infinite",
        "vhs-flicker": "vhs-flicker 0.15s infinite",
        "vhs-rgb-drift": "vhs-rgb-drift 3s ease-in-out infinite",
        "vhs-jitter": "vhs-jitter 0.3s ease-in-out",
        "ambient-shift": "ambient-shift 20s ease infinite",
        "vhs-pulse": "vhs-pulse 0.6s ease-out",
        "lens-flare": "lens-flare 0.6s ease-out",
        "soft-fade-in": "soft-fade-in 0.4s ease-out",
        "exposure-adjust": "exposure-adjust 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
