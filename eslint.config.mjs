import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Subproyectos con su propio entorno (Electron CJS y React Native/Expo);
    // el config de Next no les aplica.
    "desktop/**",
    "mobile/**",
    "public/**",
  ]),
  {
    rules: {
      // Deuda preexistente del dashboard; visible como warning sin romper CI.
      "@typescript-eslint/no-explicit-any": "warn",
      // Regla cosmética: comillas dobles en texto en español.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
