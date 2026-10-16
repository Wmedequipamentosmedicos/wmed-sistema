/** @type {import('next').NextConfig} */
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const codespaceOrigin = codespaceName && forwardingDomain
  ? [`${codespaceName}-3000.${forwardingDomain}`]
  : [];
const localOrigins = ["localhost:3000", "127.0.0.1:3000"];

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      allowedOrigins: [...new Set([...localOrigins, ...codespaceOrigin])],
    },
  },
};
export default nextConfig;
