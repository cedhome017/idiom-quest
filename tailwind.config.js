/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: { pale: "#E3F2FB", deep: "#BFE0F5" },
        ink: { DEFAULT: "#1B2A41", soft: "#4A5A72" },
        sun: { DEFAULT: "#FFC93C", deep: "#E8A800" },
        jade: { DEFAULT: "#2FA37A", deep: "#1F7A5A", pale: "#DDF4EA" },
        coral: { DEFAULT: "#E5533D", pale: "#FDE6E1" },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Songti TC"', '"PMingLiU"', "serif"],
        sans: ['"Noto Sans TC"', '"PingFang TC"', '"Microsoft JhengHei"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
