import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules"))
                        return;
                    if (id.includes("recharts") || id.includes("d3-")) {
                        return "vendor-charts";
                    }
                    if (id.includes("@mediapipe")) {
                        return "vendor-mediapipe";
                    }
                    if (id.includes("@radix-ui")) {
                        return "vendor-radix";
                    }
                    if (id.includes("lucide-react")) {
                        return "vendor-icons";
                    }
                    if (id.includes("react-router") || id.includes("react-dom") || id.includes("/react/")) {
                        return "vendor-react";
                    }
                },
            },
        },
    },
});
