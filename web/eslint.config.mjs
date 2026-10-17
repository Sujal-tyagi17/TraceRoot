import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ["next-env.d.ts", ".next/**", "node_modules/**", "e2e-results/**", "playwright-report/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Contract event args are untyped at the ABI boundary.
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "off", // QR codes are data URLs
    },
  },
];

export default config;
