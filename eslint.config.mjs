import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextCoreWebVitals = compat.extends("next/core-web-vitals");
const nextTypeScript = compat.extends("next/typescript").map((config) => ({
  ...config,
  files: ["**/*.{ts,tsx,mts,cts}"],
}));

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"],
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
